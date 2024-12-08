from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):  # Added handler parameter
        if isinstance(v, ObjectId):
            return str(v)
        return v
