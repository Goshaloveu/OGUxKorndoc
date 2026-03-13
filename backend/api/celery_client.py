"""
Minimal Celery application for sending tasks from the API container.
The worker container registers and executes the actual task implementations.
"""

from celery import Celery
from shared.config import settings

celery_app = Celery("docsearch", broker=settings.redis_url)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
