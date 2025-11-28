FROM python:3.10.12
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Copia solo requirements primero (para cachear layers)
COPY requirements.txt .
RUN pip install -r requirements.txt

# ⭐ Copia TODA la estructura (incluyendo src/)
COPY . .

# ⭐ Asegúrate que la carpeta existe en el contenedor
RUN mkdir -p /app/src/img/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5050"]

