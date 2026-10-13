from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.session import get_db
from app.models.order import Order
from app.models.refund import Refund
from app.models.user import User
from app.services.refund_service import RefundService

router = APIRouter(
    prefix="/refunds",
    tags=["Refunds"],
)


class RefundInitiateRequest(BaseModel):
    reason: str | None = Field(
        default=None,
        max_length=500,
    )

    manual_method: (
        Literal[
            "manual_upi",
            "manual_bank_transfer",
        ]
        | None
    ) = None

    @field_validator("reason")
    @classmethod
    def clean_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        return value or None


class ManualRefundCompletionRequest(BaseModel):
    transaction_reference: str = Field(
        min_length=4,
        max_length=200,
    )

    @field_validator("transaction_reference")
    @classmethod
    def clean_reference(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 4:
            raise ValueError("Enter a valid transaction reference.")

        return value


def serialize_refund(
    refund: Refund,
    *,
    is_admin: bool,
) -> dict:
    data = {
        "id": refund.id,
        "order_id": refund.order_id,
        "amount": refund.amount,
        "currency": refund.currency,
        "refund_method": refund.refund_method,
        "status": refund.status,
        "reason": refund.reason,
        "provider_refund_id": refund.provider_refund_id,
        "manual_transaction_reference": (refund.manual_transaction_reference),
        "created_at": refund.created_at,
        "updated_at": refund.updated_at,
        "completed_at": refund.completed_at,
    }

    if is_admin:
        data.update(
            {
                "payment_attempt_id": refund.payment_attempt_id,
                "initiated_by_user_id": (refund.initiated_by_user_id),
                "failure_reason": refund.failure_reason,
            }
        )

    return data


@router.post(
    "/orders/{order_id}/initiate",
    status_code=status.HTTP_201_CREATED,
)
def initiate_refund(
    order_id: int,
    data: RefundInitiateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    refund = RefundService(db).initiate_refund(
        order_id=order_id,
        admin=current_admin,
        reason=data.reason,
        manual_method=data.manual_method,
    )

    # A Cashfree refund may still be pending at the provider.
    # Return 202 rather than suggesting the money has arrived.
    response_status = (
        status.HTTP_202_ACCEPTED
        if refund.status == "processing"
        else status.HTTP_201_CREATED
    )

    return JSONResponse(
        status_code=response_status,
        content=jsonable_encoder(serialize_refund(refund, is_admin=True)),
    )


@router.post(
    "/{refund_id}/refresh",
)
def refresh_refund_status(
    refund_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    del current_admin

    refund = RefundService(db).refresh_cashfree_refund(refund_id)

    return serialize_refund(
        refund,
        is_admin=True,
    )


@router.post(
    "/{refund_id}/complete-manual",
)
def complete_manual_refund(
    refund_id: int,
    data: ManualRefundCompletionRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    refund = RefundService(db).complete_manual_refund(
        refund_id=refund_id,
        transaction_reference=data.transaction_reference,
    )

    return serialize_refund(
        refund,
        is_admin=True,
    )


@router.get(
    "/orders/{order_id}",
)
def get_order_refunds(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.scalar(select(Order).where(Order.id == order_id))

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    if current_user.role != "admin" and current_user.id != order.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    refunds = list(
        db.scalars(
            select(Refund)
            .where(Refund.order_id == order_id)
            .order_by(Refund.created_at.desc(), Refund.id.desc())
        ).all()
    )

    return [
        serialize_refund(
            refund,
            is_admin=current_user.role == "admin",
        )
        for refund in refunds
    ]
