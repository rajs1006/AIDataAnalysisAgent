from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from fastapi import status

from app.models.database.users import User
from app.models.schema.user import UserCreate
from app.core.security.auth import get_password_hash


class UserCRUD:
    @staticmethod
    async def create(user: User) -> User:
        """
        Create a new user

        :param user: User object to be inserted
        :return: Inserted user
        """
        await user.insert()
        return user

    @staticmethod
    async def create_from_data(user_data: Dict[str, Any]) -> User:
        """
        Create a new user from dictionary data

        :param user_data: Dictionary containing user details
        :return: Inserted user
        """
        user = User(**user_data)
        await user.insert()
        return user

    @staticmethod
    async def update(user: User) -> User:
        """Update an existing user"""
        try:
            # Update the updated_at timestamp
            user.updated_at = datetime.utcnow()
            
            # Find the existing user by email
            existing_user = await User.find_one({"email": user.email})
            
            if existing_user:
                # Update existing user's fields
                for key, value in user.dict(exclude_unset=True).items():
                    setattr(existing_user, key, value)
                await existing_user.save()
                return existing_user
            else:
                # If user doesn't exist, insert a new one
                await user.insert()
                return user
        except Exception as e:
            # logger.error(f"User update failed: {str(e)}")
            raise Exception(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database update failed: {str(e)}",
            )

    @staticmethod
    async def get_enabled_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        return await User.find_one({"email": email, "disabled": False})
    

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        return await User.find_one({"email": email})

    @staticmethod
    async def get_by_id(user_id: str) -> Optional[User]:
        """Get user by ID"""
        return await User.find_one({"_id": ObjectId(user_id), "disabled": False})

    @staticmethod
    async def get_by_query(query: Dict[str, Any]) -> Optional[User]:
        """
        Get user by a custom query

        :param query: Dictionary of query conditions
        :return: User matching the query or None
        """
        return await User.find_one(query)
