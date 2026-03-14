import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool
from alembic import context

from app.core.database import Base
from app.models import call, transcript, analysis_result, prediction, agent
from app.models import qa_score, coaching_session, training_module, report

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """Use DATABASE_URL from environment (Railway, etc.) so migrations use the same DB as the app."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    from app.core.config import settings
    return settings.DATABASE_URL


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(get_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
