"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-24 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "markets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("slug", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("condition_id", sa.String(), nullable=True),
        sa.Column("outcomes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("outcome_prices", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("clob_token_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("volume_num", sa.Float(), nullable=True),
        sa.Column("liquidity_num", sa.Float(), nullable=True),
        sa.Column("volume_24hr", sa.Float(), nullable=True),
        sa.Column("last_trade_price", sa.Float(), nullable=True),
        sa.Column("best_bid", sa.Float(), nullable=True),
        sa.Column("best_ask", sa.Float(), nullable=True),
        sa.Column("spread", sa.Float(), nullable=True),
        sa.Column("one_day_price_change", sa.Float(), nullable=True),
        sa.Column("one_week_price_change", sa.Float(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("closed", sa.Boolean(), nullable=False),
        sa.Column("image", sa.String(), nullable=True),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("events", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "CREATE INDEX ix_markets_active_volume ON markets (active, volume_num DESC)"
    )

    op.create_table(
        "market_snapshots",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("market_id", sa.String(), nullable=False),
        sa.Column("outcome_prices", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("last_trade_price", sa.Float(), nullable=True),
        sa.Column("volume_num", sa.Float(), nullable=True),
        sa.Column("liquidity_num", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_snapshots_market_time",
        "market_snapshots",
        ["market_id", "recorded_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_snapshots_market_time", table_name="market_snapshots")
    op.drop_table("market_snapshots")
    op.drop_index("ix_markets_active_volume", table_name="markets")
    op.drop_table("markets")
