"""
Seed ONLY review/rating data.

Products:
    IDs 1 -> 52

Skipped product:
    ID 46

Customers:
    IDs 3 -> 7

Expected:
    51 products × 5 customers = 255 reviews

This script does NOT create or modify:
- products
- categories
- users
- addresses
- orders
- cart
- wishlist
- notifications
- newsletter

It only inserts records into the reviews table.

Safe to run multiple times:
existing (user_id, product_id) combinations are skipped.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database.session import SessionLocal

# Import related models so SQLAlchemy can configure all relationships.
from app.models.address import Address  # noqa: F401
from app.models.cart import CartItem  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.newsletter import NewsletterSubscription  # noqa: F401
from app.models.order import Order, OrderItem  # noqa: F401
from app.models.payment import PaymentAttempt  # noqa: F401
from app.models.product import Product
from app.models.review import Review
from app.models.user import User
from app.models.wishlist import WishlistItem  # noqa: F401

# ============================================================================
# CONFIGURATION
# ============================================================================

PRODUCT_START_ID = 1
PRODUCT_END_ID = 52

SKIP_PRODUCT_ID = 46

CUSTOMER_START_ID = 3
CUSTOMER_END_ID = 7


# ============================================================================
# REVIEW CONTENT
# ============================================================================

FIVE_STAR_TITLES = [
    "Excellent product",
    "Really impressed",
    "Absolutely worth it",
    "Great quality",
    "Highly recommended",
    "Better than expected",
    "Very happy with it",
    "Fantastic purchase",
]

FOUR_STAR_TITLES = [
    "Very good product",
    "Good quality",
    "Happy with the purchase",
    "Nice product",
    "Good value",
    "Works really well",
    "Quite satisfied",
    "Good everyday choice",
]

THREE_STAR_TITLES = [
    "Good overall",
    "Decent product",
    "Works as expected",
    "Pretty good",
    "Average experience",
    "Good for the price",
    "Could be better",
    "Satisfactory",
]


FIVE_STAR_COMMENTS = [
    (
        "I really liked the {product}. "
        "The quality is excellent and the overall finish is impressive."
    ),
    (
        "The {product} is better than I expected. "
        "It looks great, feels well made and offers very good value."
    ),
    (
        "Very happy with the {product}. "
        "The product feels premium and I would definitely recommend it."
    ),
    (
        "Excellent experience with the {product}. "
        "The quality, design and overall finish are all very good."
    ),
    (
        "The {product} looks exactly as shown and feels great to use. "
        "Definitely one of my better purchases."
    ),
    (
        "I am impressed with the quality of the {product}. "
        "It feels reliable and worth the money."
    ),
    (
        "The {product} exceeded my expectations. "
        "Good design, good quality and a very satisfying purchase."
    ),
    (
        "Really satisfied with the {product}. "
        "The finish is excellent and I would happily recommend it."
    ),
]


FOUR_STAR_COMMENTS = [
    (
        "The {product} is a good product overall. "
        "The quality is nice and it works well for everyday use."
    ),
    ("I am happy with the {product}. " "It looks good and feels well made."),
    ("Good quality product with a nice finish. " "The {product} performs as expected."),
    (
        "The {product} is comfortable to use and feels reliable. "
        "Overall I am satisfied with the purchase."
    ),
    (
        "A good product for the price. "
        "The {product} matched my expectations quite well."
    ),
    (
        "Pretty happy with the {product}. "
        "There are a few small areas that could be improved, "
        "but it is good overall."
    ),
    (
        "The {product} is a useful everyday product. "
        "Quality is good and the design is nice."
    ),
    ("Overall a solid purchase. " "The {product} looks good and works as expected."),
]


THREE_STAR_COMMENTS = [
    (
        "The {product} is decent and does what it is supposed to do. "
        "There is some room for improvement."
    ),
    (
        "The {product} is okay for everyday use. "
        "The quality is acceptable, although I expected slightly more."
    ),
    (
        "A reasonable product for the price. "
        "The {product} works as expected but could have a better finish."
    ),
    (
        "The {product} is good enough for regular use. "
        "Some aspects are nice while others could be improved."
    ),
    (
        "My experience with the {product} has been average. "
        "It is functional but not particularly impressive."
    ),
    (
        "The {product} is fine overall. "
        "It does the job, although there is room for improvement."
    ),
    (
        "The product is usable and reasonably priced. "
        "The {product} could be improved in a few areas."
    ),
    (
        "The {product} is satisfactory. "
        "It works as described, but I expected a little more."
    ),
]


# Different ratings for different customers.
# Rotating this pattern prevents every product from having identical ratings.
RATING_PATTERN = [
    5,
    4,
    5,
    3,
    4,
]


# ============================================================================
# HELPERS
# ============================================================================


def get_rating(
    product_index: int,
    customer_index: int,
) -> int:

    return RATING_PATTERN[(product_index + customer_index) % len(RATING_PATTERN)]


def get_title(
    rating: int,
    product_index: int,
    customer_index: int,
) -> str:

    if rating == 5:
        choices = FIVE_STAR_TITLES

    elif rating == 4:
        choices = FOUR_STAR_TITLES

    else:
        choices = THREE_STAR_TITLES

    return choices[(product_index * 3 + customer_index) % len(choices)]


def get_comment(
    rating: int,
    product_name: str,
    product_index: int,
    customer_index: int,
) -> str:

    if rating == 5:
        choices = FIVE_STAR_COMMENTS

    elif rating == 4:
        choices = FOUR_STAR_COMMENTS

    else:
        choices = THREE_STAR_COMMENTS

    template = choices[(product_index * 2 + customer_index) % len(choices)]

    return template.format(
        product=product_name,
    )


def get_delivered_order(
    db,
    user_id: int,
):
    """
    Get one existing delivered order for the customer.

    The order is used only because the current Review model requires
    order_id to be non-null.

    The review is still marked:
        is_verified_purchase = False

    because these are demo reviews and we are intentionally creating
    reviews for every customer/product combination.
    """

    return db.scalar(
        select(Order)
        .where(
            Order.user_id == user_id,
            Order.status == "delivered",
        )
        .order_by(
            Order.id.desc(),
        )
        .limit(1)
    )


# ============================================================================
# SEED REVIEWS
# ============================================================================


def seed_reviews(db) -> tuple[int, int]:
    """
    Create one review from every customer for every product except ID 46.
    """

    # ------------------------------------------------------------------------
    # Get existing products.
    # ------------------------------------------------------------------------

    products = list(
        db.scalars(
            select(Product)
            .where(
                Product.id >= PRODUCT_START_ID,
                Product.id <= PRODUCT_END_ID,
                Product.id != SKIP_PRODUCT_ID,
                Product.is_active.is_(True),
            )
            .order_by(
                Product.id.asc(),
            )
        ).all()
    )

    if not products:
        raise RuntimeError("No active products found.")

    # ------------------------------------------------------------------------
    # Get customers 3 -> 7.
    # ------------------------------------------------------------------------

    customers = list(
        db.scalars(
            select(User)
            .where(
                User.id >= CUSTOMER_START_ID,
                User.id <= CUSTOMER_END_ID,
                User.role == "customer",
                User.is_active.is_(True),
            )
            .order_by(
                User.id.asc(),
            )
        ).all()
    )

    if not customers:
        raise RuntimeError("No active customers found.")

    # ------------------------------------------------------------------------
    # Existing review combinations.
    # ------------------------------------------------------------------------

    existing_rows = db.execute(
        select(
            Review.user_id,
            Review.product_id,
        )
    ).all()

    existing_combinations = {
        (
            user_id,
            product_id,
        )
        for user_id, product_id in existing_rows
    }

    expected_total = len(products) * len(customers)

    created_count = 0
    skipped_count = 0

    print()
    print("=" * 70)
    print("ShopSphere Review Seed")
    print("=" * 70)

    print(f"Products included : {len(products)}")

    print(f"Skipped product   : {SKIP_PRODUCT_ID}")

    print(f"Customers included: {len(customers)}")

    print(f"Expected reviews  : {expected_total}")

    print("=" * 70)
    print()

    # ------------------------------------------------------------------------
    # Product loop
    # ------------------------------------------------------------------------

    for product_index, product in enumerate(
        products,
    ):

        product_created = 0

        for customer_index, customer in enumerate(
            customers,
        ):

            combination = (
                customer.id,
                product.id,
            )

            # ---------------------------------------------------------------
            # Don't duplicate an existing review.
            # ---------------------------------------------------------------

            if combination in existing_combinations:

                skipped_count += 1

                continue

            # ---------------------------------------------------------------
            # Rating.
            # ---------------------------------------------------------------

            rating = get_rating(
                product_index,
                customer_index,
            )

            # ---------------------------------------------------------------
            # Review content.
            # ---------------------------------------------------------------

            title = get_title(
                rating,
                product_index,
                customer_index,
            )

            comment = get_comment(
                rating,
                product.name,
                product_index,
                customer_index,
            )

            # ---------------------------------------------------------------
            # Existing customer order.
            #
            # Your current Review schema requires order_id.
            # We therefore attach the demo review to an already-existing
            # delivered order belonging to that customer.
            #
            # It is NOT marked verified.
            # ---------------------------------------------------------------

            delivered_order = get_delivered_order(
                db,
                customer.id,
            )

            if delivered_order is None:

                print(
                    f"  Skipped User {customer.id} -> "
                    f"Product {product.id}: "
                    "customer has no delivered order."
                )

                skipped_count += 1

                continue

            # ---------------------------------------------------------------
            # Spread dates over previous 180 days.
            # ---------------------------------------------------------------

            days_ago = ((product_index * len(customers)) + customer_index + 1) % 180

            review_date = datetime.now(
                timezone.utc,
            ) - timedelta(
                days=days_ago,
            )

            # ---------------------------------------------------------------
            # Create review.
            # ---------------------------------------------------------------

            review = Review(
                product_id=product.id,
                user_id=customer.id,
                order_id=delivered_order.id,
                order_item_id=None,
                rating=rating,
                title=title,
                comment=comment,
                is_verified_purchase=False,
                created_at=review_date,
                updated_at=review_date,
            )

            db.add(
                review,
            )

            existing_combinations.add(
                combination,
            )

            created_count += 1
            product_created += 1

        print(
            f"Product {product.id:>2} | "
            f"{product.name[:42]:<42} | "
            f"{product_created} new reviews"
        )

    return (
        created_count,
        skipped_count,
    )


# ============================================================================
# MAIN
# ============================================================================


def main() -> None:

    db = SessionLocal()

    try:

        (
            created_count,
            skipped_count,
        ) = seed_reviews(
            db,
        )

        db.commit()

        print()
        print("=" * 70)
        print("Review seed completed successfully.")
        print("=" * 70)

        print(f"Reviews created : {created_count}")

        print(f"Reviews skipped : {skipped_count}")

        print(f"Expected total  : {51 * 5}")

        print(f"Skipped product : {SKIP_PRODUCT_ID}")

        print()
        print(
            "No products, users, orders, or other existing seed data "
            "were created or modified."
        )
        print("=" * 70)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
