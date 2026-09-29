"""Bridge SQLAlchemy Session to PyMySQL cursor for raw-SQL model modules."""


def get_cursor(db):
    return db.connection().connection.cursor()


def db_commit(db):
    db.connection().connection.commit()
