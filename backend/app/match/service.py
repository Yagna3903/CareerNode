"""
LangChain + Gemini AI orchestration for CareerNode match analysis.
Outputs a structured JSON: { ats_score, cover_letter, resume_tweaks }.
"""
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

from app.config import settings
from app.models import Job, UserContext
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
        model="gemini-2.0-flash",
        google_api_key=settings.google_api_key,
        temperature=0.3,
    )
    parser = PydanticOutputParser(pydantic_object=MatchResult)
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", _SYSTEM_PROMPT),
            ("human", _HUMAN_PROMPT),
        ]
    )
    return prompt | llm | parser, parser


async def run_match(job: Job, user_context: UserContext) -> MatchResult:
    """Run the LangChain chain and return a structured MatchResult."""
    chain, parser = _build_chain()
    result: MatchResult = await chain.ainvoke(
        {
            "format_instructions": parser.get_format_instructions(),
            "education": user_context.education_background,
            "resume": user_context.master_resume_text,
            "job_title": job.title,
            "company": job.company or "N/A",
            "location": job.location or "Greater Toronto Area",
            "job_description": job.description or "",
        }
    )
    return result
