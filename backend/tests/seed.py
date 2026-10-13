"""Seed ShopSphere with realistic development/demo data.

Run from backend/:
    python -m scripts.seed_database

The script is intentionally idempotent for categories, products, users and
newsletter subscribers. Orders/cart/wishlist/notifications are only created
when the corresponding demo records do not already exist.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import sys

# Allow `python scripts/seed_database.py` from backend/ as well as
# `python -m scripts.seed_database`.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.address import Address
from app.models.cart import CartItem
from app.models.category import Category
from app.models.notification import Notification
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.models.newsletter import NewsletterSubscription


# ---------------------------------------------------------------------------
# IMAGE SOURCES
# ---------------------------------------------------------------------------
# These are direct Unsplash image URLs with fixed photo IDs. Every product
# below has its own image URL; category images are also separate from products.
def img(photo_id: str, width: int = 900) -> str:
    return (
        f"https://images.unsplash.com/{photo_id}"
        f"?auto=format&fit=crop&w={width}&q=85"
    )


CATEGORY_DATA = [
    {
        "name": "Fashion",
        "slug": "fashion",
        "description": "Modern clothing and everyday wardrobe essentials.",
        "image_url": img("photo-1490481651871-ab68de25d43d"),
    },
    {
        "name": "Footwear",
        "slug": "footwear",
        "description": "Sneakers, casual shoes and performance footwear.",
        "image_url": img("photo-1549298916-b41d501d3772"),
    },
    {
        "name": "Electronics",
        "slug": "electronics",
        "description": "Smart devices, audio gear and useful technology.",
        "image_url": img("photo-1498049794561-7780e7231661"),
    },
    {
        "name": "Home & Living",
        "slug": "home-living",
        "description": "Beautiful, practical pieces for your home.",
        "image_url": img("photo-1618221195710-dd6b41faaea6"),
    },
    {
        "name": "Beauty & Care",
        "slug": "beauty-care",
        "description": "Skincare, grooming and self-care essentials.",
        "image_url": img("photo-1556228720-195a672e8a03"),
    },
    {
        "name": "Accessories",
        "slug": "accessories",
        "description": "Watches, sunglasses, jewellery and daily accessories.",
        "image_url": img("photo-1523779917675-b6ed3a42a561"),
    },
    {
        "name": "Sports & Fitness",
        "slug": "sports-fitness",
        "description": "Gear and accessories for active lifestyles.",
        "image_url": img("photo-1517836357463-d25dfeac3438"),
    },
    {
        "name": "Bags & Travel",
        "slug": "bags-travel",
        "description": "Backpacks, travel bags and everyday carry essentials.",
        "image_url": img("photo-1553062407-98eeb64c6a62"),
    },
]


# 48 products: 6 per category. Product images are intentionally unique.
PRODUCT_DATA = [
    # Fashion ---------------------------------------------------------------
    (
        "Aero Linen Overshirt",
        "aero-linen-overshirt",
        "FSH-001",
        "Fashion",
        "Northline",
        "1299",
        "1899",
        42,
        "A relaxed linen-blend overshirt designed for warm days and easy layering.",
        "Breathable linen-blend overshirt with a clean everyday silhouette.",
        img("photo-1521572163474-6864f9cf17ab"),
        True,
    ),
    (
        "Luna Ribbed Knit Top",
        "luna-ribbed-knit-top",
        "FSH-002",
        "Fashion",
        "Urban Loom",
        "899",
        "1299",
        55,
        "A soft ribbed knit top with a flattering modern fit.",
        "Soft ribbed knit top for effortless everyday styling.",
        img("photo-1485968579580-b6d095142e6e"),
        False,
    ),
    (
        "Cedar Relaxed Trousers",
        "cedar-relaxed-trousers",
        "FSH-003",
        "Fashion",
        "Northline",
        "1599",
        "2199",
        31,
        "Relaxed trousers with a structured drape and versatile neutral tone.",
        "Relaxed-fit trousers with a polished drape.",
        img("photo-1506629905607-d9d3e0a5f7f4"),
        True,
    ),
    (
        "Studio Cotton Shirt",
        "studio-cotton-shirt",
        "FSH-004",
        "Fashion",
        "Mono Studio",
        "1199",
        "1599",
        27,
        "Crisp cotton shirt designed for workdays, weekends and evenings.",
        "Crisp cotton shirt with a versatile regular fit.",
        img("photo-1596755389378-c31d21fd1273"),
        False,
    ),
    (
        "Cloudweight Hoodie",
        "cloudweight-hoodie",
        "FSH-005",
        "Fashion",
        "Everyday Co.",
        "1799",
        "2499",
        18,
        "A heavyweight brushed hoodie with a soft interior and clean finish.",
        "Soft heavyweight hoodie for cool evenings.",
        img("photo-1556821840-3a63f95609a7"),
        True,
    ),
    (
        "Everyday Denim Jacket",
        "everyday-denim-jacket",
        "FSH-006",
        "Fashion",
        "Blue Theory",
        "2199",
        "2999",
        14,
        "Classic denim jacket with a contemporary relaxed silhouette.",
        "Classic denim jacket with a relaxed modern fit.",
        img("photo-1543076447-215ad9ba6923"),
        False,
    ),
    # Footwear --------------------------------------------------------------
    (
        "Velocity Knit Sneakers",
        "velocity-knit-sneakers",
        "FTW-001",
        "Footwear",
        "StrideLab",
        "2499",
        "3299",
        24,
        "Lightweight knit sneakers built for daily movement and comfort.",
        "Lightweight everyday knit sneakers.",
        img("photo-1542291026-7eec264c27ff"),
        True,
    ),
    (
        "Apex Street Trainers",
        "apex-street-trainers",
        "FTW-002",
        "Footwear",
        "StrideLab",
        "2899",
        "3799",
        16,
        "Street-ready trainers with cushioned midsoles and a bold profile.",
        "Cushioned trainers with a bold street profile.",
        img("photo-1552346154-21d32810aba3"),
        True,
    ),
    (
        "Harbor Canvas Sneakers",
        "harbor-canvas-sneakers",
        "FTW-003",
        "Footwear",
        "Canvas Works",
        "1499",
        "1999",
        38,
        "Minimal canvas sneakers that pair easily with casual outfits.",
        "Minimal canvas sneakers for everyday wear.",
        img("photo-1525966222134-fcfa99b8ae77"),
        False,
    ),
    (
        "Terra Trail Runners",
        "terra-trail-runners",
        "FTW-004",
        "Footwear",
        "PeakForm",
        "3199",
        "4299",
        12,
        "Trail-inspired running shoes with grippy soles and responsive cushioning.",
        "Trail-ready running shoes with responsive cushioning.",
        img("photo-1551698618-1dfe5d97d256"),
        True,
    ),
    (
        "Nova Court Low",
        "nova-court-low",
        "FTW-005",
        "Footwear",
        "Courtline",
        "2299",
        "2999",
        21,
        "Low-profile court sneakers with a clean premium finish.",
        "Clean low-profile court sneakers.",
        img("photo-1560769629-975ec94e6a86"),
        False,
    ),
    (
        "Drift Slip-On",
        "drift-slip-on",
        "FTW-006",
        "Footwear",
        "EasyStep",
        "1299",
        "1699",
        44,
        "Easy slip-on shoes for quick commutes and relaxed weekends.",
        "Comfortable slip-ons for quick everyday wear.",
        img("photo-1520256862855-398228c41684"),
        False,
    ),
    # Electronics -----------------------------------------------------------
    (
        "Orbit Wireless Headphones",
        "orbit-wireless-headphones",
        "ELC-001",
        "Electronics",
        "SoundPeak",
        "3999",
        "5499",
        19,
        "Over-ear wireless headphones with rich sound, soft cushions and long battery life.",
        "Premium wireless over-ear headphones.",
        img("photo-1505740420928-5e560c06d30e"),
        True,
    ),
    (
        "Pulse ANC Earbuds",
        "pulse-anc-earbuds",
        "ELC-002",
        "Electronics",
        "SoundPeak",
        "2799",
        "3499",
        33,
        "Compact earbuds with active noise cancellation and a pocket-sized charging case.",
        "Compact ANC earbuds with a pocket charging case.",
        img("photo-1590658268037-6bf12165a8df"),
        True,
    ),
    (
        "Nova Smartwatch S2",
        "nova-smartwatch-s2",
        "ELC-003",
        "Electronics",
        "NovaTech",
        "4999",
        "6499",
        15,
        "A modern smartwatch with activity tracking, notifications and a bright display.",
        "Modern smartwatch for daily activity tracking.",
        img("photo-1523275335684-37898b6baf30"),
        True,
    ),
    (
        "Arc Mechanical Keyboard",
        "arc-mechanical-keyboard",
        "ELC-004",
        "Electronics",
        "KeyForge",
        "3599",
        "4499",
        17,
        "Compact mechanical keyboard with tactile switches and a clean desk aesthetic.",
        "Compact mechanical keyboard for focused work.",
        img("photo-1587829741301-dc798b83add3"),
        False,
    ),
    (
        "Beam Desk Lamp Pro",
        "beam-desk-lamp-pro",
        "ELC-005",
        "Electronics",
        "Luma",
        "1899",
        "2499",
        28,
        "Minimal LED desk lamp with adjustable brightness and a weighted base.",
        "Minimal adjustable LED desk lamp.",
        img("photo-1507473885765-e6ed057f782c"),
        False,
    ),
    (
        "Snap Mini Speaker",
        "snap-mini-speaker",
        "ELC-006",
        "Electronics",
        "SoundPeak",
        "2199",
        "2799",
        26,
        "Portable Bluetooth speaker with punchy audio and a compact travel-friendly form.",
        "Compact portable Bluetooth speaker.",
        img("photo-1608043152269-423dbba4e7e1"),
        False,
    ),
    # Home & Living ---------------------------------------------------------
    (
        "Nordic Ceramic Vase",
        "nordic-ceramic-vase",
        "HOM-001",
        "Home & Living",
        "CasaForm",
        "799",
        "1099",
        35,
        "Hand-finished ceramic vase with a calm sculptural silhouette.",
        "Sculptural ceramic vase for modern interiors.",
        img("photo-1610701596007-11502861dcfa"),
        True,
    ),
    (
        "Linen Lounge Cushion",
        "linen-lounge-cushion",
        "HOM-002",
        "Home & Living",
        "CasaForm",
        "699",
        "899",
        47,
        "Textured linen cushion cover that adds warmth and softness to a room.",
        "Textured linen cushion for a softer room.",
        img("photo-1584100936595-c0654b55a2e2"),
        False,
    ),
    (
        "Oakline Table Clock",
        "oakline-table-clock",
        "HOM-003",
        "Home & Living",
        "Oakline",
        "1099",
        "1499",
        22,
        "Minimal tabletop clock with a warm wood-inspired finish.",
        "Minimal tabletop clock with warm detailing.",
        img("photo-1501139083538-0139583c060f"),
        False,
    ),
    (
        "Mist Glass Tumbler Set",
        "mist-glass-tumbler-set",
        "HOM-004",
        "Home & Living",
        "ClearHouse",
        "899",
        "1199",
        40,
        "Elegant set of six clear tumblers for everyday dining and hosting.",
        "Set of six elegant everyday tumblers.",
        img("photo-1572119865084-43c285814d63"),
        True,
    ),
    (
        "Softline Throw Blanket",
        "softline-throw-blanket",
        "HOM-005",
        "Home & Living",
        "CasaForm",
        "1499",
        "1999",
        25,
        "A soft woven throw blanket for couches, reading corners and cool evenings.",
        "Soft woven throw for cosy evenings.",
        img("photo-1586023492125-27b2c045efd7"),
        True,
    ),
    (
        "Contour Wall Mirror",
        "contour-wall-mirror",
        "HOM-006",
        "Home & Living",
        "FormHaus",
        "2299",
        "2999",
        9,
        "Rounded wall mirror designed to make spaces feel brighter and more open.",
        "Rounded wall mirror for a brighter interior.",
        img("photo-1618220179428-22790b461013"),
        False,
    ),
    # Beauty & Care ---------------------------------------------------------
    (
        "Dew Daily Moisturizer",
        "dew-daily-moisturizer",
        "BEA-001",
        "Beauty & Care",
        "PureKind",
        "749",
        "999",
        52,
        "Lightweight daily moisturizer with a smooth, non-greasy finish.",
        "Lightweight daily moisturizer for a fresh finish.",
        img("photo-1620916566398-39f1143ab7be"),
        True,
    ),
    (
        "Calm Cleanser Gel",
        "calm-cleanser-gel",
        "BEA-002",
        "Beauty & Care",
        "PureKind",
        "599",
        "799",
        61,
        "Gentle gel cleanser designed for a clean, comfortable post-wash feel.",
        "Gentle daily gel cleanser.",
        img("photo-1556229010-6c3f2c9ca5f8"),
        False,
    ),
    (
        "Glow Facial Serum",
        "glow-facial-serum",
        "BEA-003",
        "Beauty & Care",
        "LumaSkin",
        "999",
        "1399",
        34,
        "Lightweight facial serum designed for a fresh, luminous-looking complexion.",
        "Lightweight serum for a luminous-looking complexion.",
        img("photo-1620916297397-a4a5402a3c6c"),
        True,
    ),
    (
        "Silk Hand Cream",
        "silk-hand-cream",
        "BEA-004",
        "Beauty & Care",
        "SoftLab",
        "399",
        "549",
        73,
        "Fast-absorbing hand cream with a soft finish and subtle fragrance.",
        "Fast-absorbing everyday hand cream.",
        img("photo-1608248543803-ba4f8c70ae0b"),
        False,
    ),
    (
        "Cedar Grooming Kit",
        "cedar-grooming-kit",
        "BEA-005",
        "Beauty & Care",
        "Gentleman Co.",
        "1299",
        "1699",
        20,
        "A compact grooming kit with everyday essentials for travel and home.",
        "Compact grooming kit for home and travel.",
        img("photo-1621605815971-fbc98d665033"),
        False,
    ),
    (
        "Botanical Bath Set",
        "botanical-bath-set",
        "BEA-006",
        "Beauty & Care",
        "PureKind",
        "1099",
        "1499",
        29,
        "A calming bath collection with a clean botanical-inspired presentation.",
        "Relaxing botanical-inspired bath collection.",
        img("photo-1600334089648-b0d9d3028eb2"),
        True,
    ),
    # Accessories -----------------------------------------------------------
    (
        "Atlas Minimal Watch",
        "atlas-minimal-watch",
        "ACC-001",
        "Accessories",
        "Aster",
        "2799",
        "3599",
        18,
        "Minimal analogue watch with a refined dial and everyday styling.",
        "Minimal analogue watch with a refined dial.",
        img("photo-1524805444758-089113d48a6d"),
        True,
    ),
    (
        "Solis Round Sunglasses",
        "solis-round-sunglasses",
        "ACC-002",
        "Accessories",
        "Solis",
        "999",
        "1399",
        36,
        "Classic round sunglasses with a lightweight frame and timeless profile.",
        "Classic round sunglasses with a lightweight frame.",
        img("photo-1511499767150-a48a237f0083"),
        True,
    ),
    (
        "Aurelia Chain Necklace",
        "aurelia-chain-necklace",
        "ACC-003",
        "Accessories",
        "Aurelia",
        "899",
        "1199",
        31,
        "Delicate chain necklace with a polished finish for everyday layering.",
        "Delicate polished chain necklace.",
        img("photo-1599643478518-a784e5dc4c8f"),
        False,
    ),
    (
        "Metro Leather Belt",
        "metro-leather-belt",
        "ACC-004",
        "Accessories",
        "Craft & Co.",
        "1199",
        "1599",
        23,
        "Classic leather belt with a clean metal buckle and versatile finish.",
        "Classic leather belt with a clean buckle.",
        img("photo-1624222247344-550fb60583dc"),
        False,
    ),
    (
        "Halo Hoop Earrings",
        "halo-hoop-earrings",
        "ACC-005",
        "Accessories",
        "Aurelia",
        "699",
        "899",
        45,
        "Lightweight hoop earrings designed for simple everyday styling.",
        "Lightweight everyday hoop earrings.",
        img("photo-1535632066927-ab7c9ab60908"),
        True,
    ),
    (
        "Core Card Holder",
        "core-card-holder",
        "ACC-006",
        "Accessories",
        "Craft & Co.",
        "649",
        "899",
        57,
        "Slim card holder with compact storage and a refined finish.",
        "Slim everyday card holder.",
        img("photo-1627123424574-724758594e93"),
        False,
    ),
    # Sports & Fitness ------------------------------------------------------
    (
        "Flex Training Mat",
        "flex-training-mat",
        "SPT-001",
        "Sports & Fitness",
        "PeakForm",
        "1199",
        "1599",
        32,
        "Comfortable non-slip training mat for stretching, yoga and home workouts.",
        "Non-slip training mat for home workouts.",
        img("photo-1592432678016-e910b452f9a2"),
        True,
    ),
    (
        "Sprint Running Bottle",
        "sprint-running-bottle",
        "SPT-002",
        "Sports & Fitness",
        "PeakForm",
        "499",
        "699",
        68,
        "Lightweight sports bottle with an easy-grip shape for runs and workouts.",
        "Lightweight sports bottle for active days.",
        img("photo-1602143407151-7111542de6e8"),
        False,
    ),
    (
        "Core Resistance Bands",
        "core-resistance-bands",
        "SPT-003",
        "Sports & Fitness",
        "MotionLab",
        "799",
        "1099",
        41,
        "Progressive resistance bands for strength, mobility and warm-up routines.",
        "Progressive resistance bands for training.",
        img("photo-1598971639058-fab3c3109a00"),
        True,
    ),
    (
        "Aero Training Gloves",
        "aero-training-gloves",
        "SPT-004",
        "Sports & Fitness",
        "MotionLab",
        "699",
        "999",
        27,
        "Breathable training gloves with padded palms for gym sessions.",
        "Breathable padded training gloves.",
        img("photo-1581009146145-b5ef050c2e1e"),
        False,
    ),
    (
        "Balance Foam Roller",
        "balance-foam-roller",
        "SPT-005",
        "Sports & Fitness",
        "PeakForm",
        "899",
        "1199",
        24,
        "Textured foam roller for recovery, mobility and post-workout routines.",
        "Textured foam roller for recovery.",
        img("photo-1597452485669-2c7bb5fef90d"),
        False,
    ),
    (
        "Pulse Smart Jump Rope",
        "pulse-smart-jump-rope",
        "SPT-006",
        "Sports & Fitness",
        "MotionLab",
        "1299",
        "1699",
        20,
        "Compact jump rope designed for cardio sessions and quick indoor workouts.",
        "Compact jump rope for cardio workouts.",
        img("photo-1517838277536-f5f99be50148"),
        True,
    ),
    # Bags & Travel ---------------------------------------------------------
    (
        "Transit Daypack",
        "transit-daypack",
        "BAG-001",
        "Bags & Travel",
        "Roam",
        "1899",
        "2499",
        26,
        "A clean everyday backpack with a padded laptop sleeve and practical compartments.",
        "Everyday backpack with a padded laptop sleeve.",
        img("photo-1553062407-98eeb64c6a62"),
        True,
    ),
    (
        "Weekender Duffel",
        "weekender-duffel",
        "BAG-002",
        "Bags & Travel",
        "Roam",
        "2299",
        "2999",
        17,
        "Spacious weekender bag with a structured base and comfortable carry handles.",
        "Spacious weekend travel duffel.",
        img("photo-1553531384-397c80973a0b"),
        True,
    ),
    (
        "Metro Sling Bag",
        "metro-sling-bag",
        "BAG-003",
        "Bags & Travel",
        "Urban Carry",
        "999",
        "1399",
        39,
        "Compact crossbody sling for phone, wallet and daily essentials.",
        "Compact crossbody sling for everyday carry.",
        img("photo-1590874103328-eac38a683ce7"),
        False,
    ),
    (
        "Voyage Cabin Case",
        "voyage-cabin-case",
        "BAG-004",
        "Bags & Travel",
        "Voyage",
        "4499",
        "5999",
        11,
        "Compact cabin case with a clean shell, smooth wheels and organized interior.",
        "Compact cabin case for short trips.",
        img("photo-1565026057447-bc90a3dceb87"),
        True,
    ),
    (
        "Trail Utility Pouch",
        "trail-utility-pouch",
        "BAG-005",
        "Bags & Travel",
        "Roam",
        "699",
        "899",
        48,
        "Small utility pouch for cables, toiletries or compact travel essentials.",
        "Compact utility pouch for travel essentials.",
        img("photo-1548036328-c9fa89d128fa"),
        False,
    ),
    (
        "Canvas Market Tote",
        "canvas-market-tote",
        "BAG-006",
        "Bags & Travel",
        "Everyday Co.",
        "599",
        "799",
        64,
        "Durable canvas tote with comfortable handles for errands and daily carry.",
        "Durable canvas tote for everyday use.",
        img("photo-1594223274512-ad4803739b7c"),
        False,
    ),
]


CUSTOMERS = [
    ("Aarav Sharma", "aarav@shopsphere.demo", "Customer@123"),
    ("Priya Deshmukh", "priya@shopsphere.demo", "Customer@123"),
    ("Rohan Patil", "rohan@shopsphere.demo", "Customer@123"),
    ("Ananya Kulkarni", "ananya@shopsphere.demo", "Customer@123"),
    ("Vikram Mehta", "vikram@shopsphere.demo", "Customer@123"),
    ("Sneha Joshi", "sneha@shopsphere.demo", "Customer@123"),
    ("Kabir Shah", "kabir@shopsphere.demo", "Customer@123"),
    ("Meera Nair", "meera@shopsphere.demo", "Customer@123"),
]


ADDRESS_DATA = [
    (
        "aarav@shopsphere.demo",
        "Home",
        "Aarav Sharma",
        "+91 98765 10001",
        "14 Lake View Road",
        "Nagpur",
        "Maharashtra",
        "440001",
        True,
    ),
    (
        "aarav@shopsphere.demo",
        "Office",
        "Aarav Sharma",
        "+91 98765 10001",
        "Tech Park, Wardha Road",
        "Nagpur",
        "Maharashtra",
        "440015",
        False,
    ),
    (
        "priya@shopsphere.demo",
        "Home",
        "Priya Deshmukh",
        "+91 98765 10002",
        "28 Green Avenue",
        "Pune",
        "Maharashtra",
        "411001",
        True,
    ),
    (
        "rohan@shopsphere.demo",
        "Home",
        "Rohan Patil",
        "+91 98765 10003",
        "7 Riverfront Lane",
        "Mumbai",
        "Maharashtra",
        "400001",
        True,
    ),
    (
        "ananya@shopsphere.demo",
        "Home",
        "Ananya Kulkarni",
        "+91 98765 10004",
        "19 Orchid Residency",
        "Bengaluru",
        "Karnataka",
        "560001",
        True,
    ),
    (
        "vikram@shopsphere.demo",
        "Home",
        "Vikram Mehta",
        "+91 98765 10005",
        "45 Park Street",
        "Nashik",
        "Maharashtra",
        "422001",
        True,
    ),
    (
        "sneha@shopsphere.demo",
        "Home",
        "Sneha Joshi",
        "+91 98765 10006",
        "9 Sunrise Enclave",
        "Indore",
        "Madhya Pradesh",
        "452001",
        True,
    ),
    (
        "kabir@shopsphere.demo",
        "Home",
        "Kabir Shah",
        "+91 98765 10007",
        "63 Palm Grove",
        "Ahmedabad",
        "Gujarat",
        "380001",
        True,
    ),
    (
        "meera@shopsphere.demo",
        "Home",
        "Meera Nair",
        "+91 98765 10008",
        "22 Marine View",
        "Kochi",
        "Kerala",
        "682001",
        True,
    ),
]


NEWSLETTER_EMAILS = [
    "newsletter.one@shopsphere.demo",
    "newsletter.two@shopsphere.demo",
    "newsletter.three@shopsphere.demo",
    "newsletter.four@shopsphere.demo",
    "newsletter.five@shopsphere.demo",
    "newsletter.six@shopsphere.demo",
]


PAYMENT_METHODS = ["cash_on_delivery", "upi", "card"]
ORDER_STATUSES = [
    "placed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "return_requested",
    "return_approved",
    "returned",
    "refunded",
]


def money(value: str | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def get_or_create_user(
    db, name: str, email: str, password: str, role: str = "customer"
) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def seed_categories(db) -> dict[str, Category]:
    categories: dict[str, Category] = {}
    for data in CATEGORY_DATA:
        category = db.scalar(select(Category).where(Category.slug == data["slug"]))
        if category is None:
            category = Category(**data)
            db.add(category)
            db.flush()
        else:
            # Keep the seed useful if the category already exists.
            category.description = data["description"]
            category.image_url = data["image_url"]
            category.is_active = True
        categories[data["name"]] = category
    return categories


def seed_products(db, categories: dict[str, Category]) -> list[Product]:
    products: list[Product] = []
    for row in PRODUCT_DATA:
        (
            name,
            slug,
            sku,
            category_name,
            brand,
            price,
            compare_at_price,
            stock,
            description,
            short_description,
            image_url,
            featured,
        ) = row
        product = db.scalar(select(Product).where(Product.slug == slug))
        if product is None:
            product = Product(
                name=name,
                slug=slug,
                sku=sku,
                category_id=categories[category_name].id,
                brand=brand,
                price=money(price),
                compare_at_price=money(compare_at_price) if compare_at_price else None,
                stock_quantity=stock,
                description=description,
                short_description=short_description,
                image_url=image_url,
                is_active=True,
                is_featured=featured,
            )
            db.add(product)
            db.flush()
        else:
            product.name = name
            product.sku = sku
            product.category_id = categories[category_name].id
            product.brand = brand
            product.price = money(price)
            product.compare_at_price = (
                money(compare_at_price) if compare_at_price else None
            )
            product.stock_quantity = stock
            product.description = description
            product.short_description = short_description
            product.image_url = image_url
            product.is_active = True
            product.is_featured = featured
        products.append(product)
    return products


def seed_addresses(db, users: dict[str, User]) -> list[Address]:
    addresses: list[Address] = []
    for row in ADDRESS_DATA:
        (
            email,
            label,
            full_name,
            phone,
            address_line,
            city,
            state,
            postal_code,
            is_default,
        ) = row
        user = users[email]
        exists = db.scalar(
            select(Address).where(
                Address.user_id == user.id,
                Address.label == label,
            )
        )
        if exists:
            addresses.append(exists)
            continue
        address = Address(
            user_id=user.id,
            label=label,
            full_name=full_name,
            phone=phone,
            address_line=address_line,
            city=city,
            state=state,
            postal_code=postal_code,
            country="India",
            is_default=is_default,
        )
        db.add(address)
        db.flush()
        addresses.append(address)
    return addresses


def seed_cart_and_wishlist(db, users: dict[str, User], products: list[Product]) -> None:
    if db.scalar(select(CartItem.id).limit(1)) is None:
        customer_list = list(users.values())
        for index, user in enumerate(customer_list):
            for offset in range(2):
                product = products[(index * 3 + offset) % len(products)]
                db.add(
                    CartItem(
                        user_id=user.id,
                        product_id=product.id,
                        quantity=1 + (index + offset) % 3,
                    )
                )

    if db.scalar(select(WishlistItem.id).limit(1)) is None:
        customer_list = list(users.values())
        for index, user in enumerate(customer_list):
            for offset in range(3):
                product = products[(index * 5 + offset + 7) % len(products)]
                db.add(WishlistItem(user_id=user.id, product_id=product.id))


def create_order(
    db,
    user: User,
    products: list[Product],
    address: Address,
    status: str,
    order_index: int,
) -> Order:
    selected = [
        products[(order_index * 3) % len(products)],
        products[(order_index * 3 + 7) % len(products)],
    ]
    quantities = [1 + (order_index % 2), 1]
    subtotal = Decimal("0.00")
    items: list[OrderItem] = []

    for product, quantity in zip(selected, quantities):
        unit_price = money(product.price)
        line_total = unit_price * quantity
        subtotal += line_total
        items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                unit_price=unit_price,
                quantity=quantity,
                line_total=line_total,
            )
        )

    shipping = Decimal("0.00") if subtotal >= Decimal("1999.00") else Decimal("99.00")
    order = Order(
        user_id=user.id,
        full_name=address.full_name,
        phone=address.phone,
        address_line=address.address_line,
        city=address.city,
        state=address.state,
        postal_code=address.postal_code,
        payment_method=PAYMENT_METHODS[order_index % len(PAYMENT_METHODS)],
        shipping_amount=shipping,
        total_amount=subtotal + shipping,
        status=status,
        stock_restored=status in {"cancelled", "returned", "refunded"},
        cancellation_reason=("Changed my mind" if status == "cancelled" else None),
        return_reason=(
            "Product no longer required"
            if status in {"return_requested", "return_approved", "returned", "refunded"}
            else None
        ),
        return_requested_at=(
            datetime.now(timezone.utc) - timedelta(days=2)
            if status in {"return_requested", "return_approved", "returned", "refunded"}
            else None
        ),
        return_processed_at=(
            datetime.now(timezone.utc) - timedelta(days=1)
            if status in {"return_approved", "returned", "refunded"}
            else None
        ),
        cancelled_at=(
            datetime.now(timezone.utc) - timedelta(days=3)
            if status == "cancelled"
            else None
        ),
    )
    order.created_at = datetime.now(timezone.utc) - timedelta(days=order_index * 3 + 1)
    order.items = items
    db.add(order)
    db.flush()
    return order


def seed_orders(
    db, users: dict[str, User], products: list[Product], addresses: list[Address]
) -> list[Order]:
    if db.scalar(select(Order.id).limit(1)) is not None:
        return list(db.scalars(select(Order).order_by(Order.id)).all())

    address_by_email = {}
    for address in addresses:
        if address.is_default:
            # Match through the users mapping rather than assuming IDs.
            for email, user in users.items():
                if user.id == address.user_id:
                    address_by_email[email] = address
                    break

    statuses = [
        "delivered",
        "delivered",
        "shipped",
        "processing",
        "placed",
        "cancelled",
        "delivered",
        "return_requested",
        "returned",
        "refunded",
        "delivered",
        "shipped",
        "processing",
        "placed",
        "delivered",
    ]
    emails = list(users.keys())
    orders: list[Order] = []
    for index, status in enumerate(statuses):
        email = emails[index % len(emails)]
        address = address_by_email[email]
        orders.append(create_order(db, users[email], products, address, status, index))
    return orders


def seed_notifications(db, users: dict[str, User], orders: list[Order]) -> None:
    if db.scalar(select(Notification.id).limit(1)) is not None:
        return

    customer_list = list(users.values())
    for index, user in enumerate(customer_list):
        order = orders[index % len(orders)]
        db.add(
            Notification(
                user_id=user.id,
                order_id=order.id,
                event_type="order_update",
                title="Order update",
                message=f"Your ShopSphere order #{order.id} is currently {order.status.replace('_', ' ')}.",
                is_read=index % 3 == 0,
                read_at=(datetime.now(timezone.utc) if index % 3 == 0 else None),
            )
        )


def seed_newsletter(db) -> None:
    for email in NEWSLETTER_EMAILS:
        if (
            db.scalar(
                select(NewsletterSubscription.id).where(
                    NewsletterSubscription.email == email
                )
            )
            is None
        ):
            db.add(NewsletterSubscription(email=email))


def main() -> None:
    db = SessionLocal()
    try:
        categories = seed_categories(db)

        users: dict[str, User] = {}
        for name, email, password in CUSTOMERS:
            users[email] = get_or_create_user(db, name, email, password)

        # Uses the same default admin credentials already defined by the app.
        admin = get_or_create_user(
            db,
            "ShopSphere Admin",
            "admin@shopsphere.io",
            "Admin@1234",
            role="admin",
        )

        products = seed_products(db, categories)
        addresses = seed_addresses(db, users)
        seed_cart_and_wishlist(db, users, products)
        orders = seed_orders(db, users, products, addresses)
        seed_notifications(db, users, orders)
        seed_newsletter(db)

        db.commit()

        print("\nShopSphere seed completed successfully.")
        print(f"Categories : {len(categories)}")
        print(f"Products   : {len(products)}")
        print(f"Customers  : {len(users)}")
        print(f"Admin      : {admin.email}")
        print(f"Orders     : {len(orders)}")
        print(f"Addresses  : {len(addresses)}")
        print("\nDemo login credentials:")
        print("  Admin    : admin@shopsphere.io / Admin@1234")
        print("  Customer : aarav@shopsphere.demo / Customer@123")
        print("  Customer : priya@shopsphere.demo / Customer@123")
        print("  Customer : rohan@shopsphere.demo / Customer@123")
        print("  Customer : ananya@shopsphere.demo / Customer@123")
        print("  Customer : vikram@shopsphere.demo / Customer@123")
        print("  Customer : sneha@shopsphere.demo / Customer@123")
        print("  Customer : kabir@shopsphere.demo / Customer@123")
        print("  Customer : meera@shopsphere.demo / Customer@123")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
