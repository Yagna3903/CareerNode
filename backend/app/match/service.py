"""
LangChain + Gemini AI orchestration for CareerNode match analysis.
Outputs a structured JSON: { ats_score, cover_letter, resume_tweaks }.
Accepts plain dicts (from supabase client) instead of ORM models.
"""
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from app.config import settings
from app.schemas import MatchResult

_SYSTEM_PROMPT = """\
You are an elite technical resume strategist and ATS optimization engine. \
You write like a Senior Information Systems Engineer: precise, confident, \
technically rigorous — never generic, never filler.

Your task: analyse the candidate's resume against a specific job description \
and return ONLY a valid JSON object with no markdown fencing or extra text. \
The JSON must exactly match this schema:

{format_instructions}
"""

_HUMAN_PROMPT = """\
## CANDIDATE PROFILE

**Education:** {education}

**Master Resume:**
{resume}

---

## TARGET JOB

**Title:** {job_title}
**Company:** {company}
**Location:** {location}

**Description:**
{job_description}

---

Produce the JSON analysis now. The cover letter must be 3–4 paragraphs, \
written in the first person, and sound like a Senior Information Systems \
Engineer — not an eager graduate. Resume tweaks must be concrete bullet \
point rewrites with a rationale for each ATS keyword targeted.
"""


def _build_chain():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.google_api_key,
        temperature=0.3,
        max_retries=0,  # Prevent proxy timeouts / socket drops
    )
    parser = PydanticOutputParser(pydantic_object=MatchResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", _SYSTEM_PROMPT),
            ("human", _HUMAN_PROMPT),
        ]
    )
    return prompt | llm | parser, parser


async def run_match(job: dict, user_context: dict) -> MatchResult:
    """Run the LangChain chain and return a structured MatchResult.

    Both `job` and `user_context` are plain dicts from the supabase client.
    """
    import logging
    from fastapi import HTTPException
    
    logger = logging.getLogger(__name__)
    chain, parser = _build_chain()
    
    try:
        result: MatchResult = await chain.ainvoke(
            {
                "format_instructions": parser.get_format_instructions(),
                "education": user_context.get("education_background", "Information Systems Engineering"),
                "resume": user_context.get("master_resume_text", ""),
                "job_title": job.get("title", ""),
                "company": job.get("company") or "N/A",
                "location": job.get("location") or "Greater Toronto Area",
                "job_description": (job.get("description") or "")[:6000],
            }
        )
        return result
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Gemini API or Parsing Error: {err_msg}")
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            raise HTTPException(status_code=502, detail="Google AI Quota Exceeded. Please check your Gemini API plan / wait for limits to reset.")
        raise HTTPException(status_code=502, detail="AI Match Engine failed to process the request.")
