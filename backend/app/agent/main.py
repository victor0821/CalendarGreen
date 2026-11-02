from strands import Agent
from config import get_model

SYSTEM_PROMPT = """Eres el asistente virtual para un calendario de una persona.
Atiendes a personas en español, de forma clara y amable que quieren ordenar su tiempo.
"""


def crear_agente() -> Agent:
    """Crea y configura el asistente de calendario."""
    return Agent(
        model=get_model(),
        system_prompt=SYSTEM_PROMPT,
    )


if __name__ == "__main__":
    agente = crear_agente()
    agente("hola necesito que me digas que dia es hoy")