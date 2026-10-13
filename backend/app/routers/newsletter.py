from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.newsletter import NewsletterSubscription
from app.schemas.newsletter import (
    NewsletterSubscriptionCreate,
    NewsletterSubscriptionResponse,
)

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])


@router.post(
    "/subscribe",
    response_model=NewsletterSubscriptionResponse,
)
def subscribe_to_newsletter(
    payload: NewsletterSubscriptionCreate,
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()
    existing = db.scalar(
        select(NewsletterSubscription).where(
            NewsletterSubscription.email == email
        )
    )
    if existing is None:
        db.add(NewsletterSubscription(email=email))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = db.scalar(
                select(NewsletterSubscription).where(
                    NewsletterSubscription.email == email
                )
            )
            if existing is None:
                raise

    return {"message": "Thanks for subscribing to ShopSphere updates."}
