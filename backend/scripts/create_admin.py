"""
CLI script to create the first admin user directly in the database.

Usage:
    docker-compose exec api python scripts/create_admin.py \
        --email admin@company.com --password admin123 --username admin
"""

import argparse
import asyncio
import logging
import sys

from sqlalchemy import select

sys.path.insert(0, "/app")

from shared.database import AsyncSessionLocal
from shared.models import User
from shared.security import hash_password

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def create_admin(email: str, password: str, username: str) -> None:
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing is not None:
            logger.error("User with email '%s' already exists (id=%d)", email, existing.id)
            sys.exit(1)

        result = await session.execute(select(User).where(User.username == username))
        existing = result.scalar_one_or_none()
        if existing is not None:
            logger.error("User with username '%s' already exists (id=%d)", username, existing.id)
            sys.exit(1)

        user = User(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            role="admin",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    logger.info(
        "Admin user created: id=%d email=%s username=%s",
        user.id,
        user.email,
        user.username,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Create admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument("--username", required=True, help="Admin username")
    args = parser.parse_args()

    asyncio.run(create_admin(args.email, args.password, args.username))


if __name__ == "__main__":
    main()
