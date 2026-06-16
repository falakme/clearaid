"""ER team management.

System Admins create ER team records and assign each a city. ER team members
are matched to their team by Clerk user id. Write endpoints are admin-guarded
(shared key, injected by the Next.js admin proxy); the `by-user` lookup is a
public read used to gate the ER dashboard.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import ErTeam
from app.schemas import ErTeamCreate, ErTeamOut, ErTeamUpdate

router = APIRouter(tags=["er-teams"])


def require_admin(x_admin_key: Optional[str] = Header(default=None)) -> None:
    settings = get_settings()
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing admin key.")


@router.get(
    "/api/er-teams",
    response_model=list[ErTeamOut],
    dependencies=[Depends(require_admin)],
)
def list_er_teams(db: Session = Depends(get_db)) -> list[ErTeam]:
    return list(db.scalars(select(ErTeam).order_by(ErTeam.created_at.desc())).all())


@router.post(
    "/api/er-teams",
    response_model=ErTeamOut,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def create_er_team(payload: ErTeamCreate, db: Session = Depends(get_db)) -> ErTeam:
    team = ErTeam(**payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.patch(
    "/api/er-teams/{team_id}",
    response_model=ErTeamOut,
    dependencies=[Depends(require_admin)],
)
def update_er_team(
    team_id: int, payload: ErTeamUpdate, db: Session = Depends(get_db)
) -> ErTeam:
    team = db.get(ErTeam, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="ER team not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team


@router.delete(
    "/api/er-teams/{team_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
def delete_er_team(team_id: int, db: Session = Depends(get_db)) -> None:
    team = db.get(ErTeam, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="ER team not found.")
    db.delete(team)
    db.commit()


@router.get("/api/er-teams/by-user", response_model=Optional[ErTeamOut])
def er_team_by_user(
    clerk_user_id: str = Query(..., description="Clerk user id to look up."),
    db: Session = Depends(get_db),
) -> Optional[ErTeam]:
    """Public read used by the ER dashboard gate: returns the active ER team
    linked to this Clerk user, or null. No admin key required (low
    sensitivity — reveals only team membership by opaque user id)."""
    cid = (clerk_user_id or "").strip()
    if not cid:
        return None
    return db.scalar(
        select(ErTeam)
        .where(ErTeam.clerk_user_id == cid)
        .where(ErTeam.is_active.is_(True))
        .order_by(ErTeam.created_at.desc())
    )
