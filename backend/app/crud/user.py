from typing import Optional
from bson import ObjectId

from app.models.database.users import User
from app.models.schema.user import UserCreate
from app.core.security.auth import get_password_hash


class UserCRUD:
    @staticmethod
    async def create(user_data: UserCreate) -> User:
        """Create a new user"""
        user = User(
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
            full_name=user_data.full_name,
        )
        await user.insert()
        return user

    @staticmethod
    async def update(user: User) -> User:
        """Update an existing user"""
        try:
            await user.upsert()
            return user
        except Exception as e:
            # logger.error(f"User update failed: {str(e)}")
            raise Exception(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database update failed: {str(e)}",
            )

    @staticmethod
    async def get_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        return await User.find_one({"email": email, "disabled": False})

    @staticmethod
    async def get_by_id(user_id: str) -> Optional[User]:
        """Get user by ID"""
        return await User.find_one({"_id": ObjectId(user_id), "disabled": False})
