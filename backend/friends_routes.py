import psycopg2
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
import database_access

router = APIRouter(tags=["friends"])


def get_conn():
    conn = database_access.get_connection()
    try:
        yield conn
    finally:
        conn.close()


# ── request models ────────────────────────────────────────────────────────────

class FriendRequest(BaseModel):
    requester: str      # user sending the request
    recipient: str      # user receiving it


class FriendAction(BaseModel):
    user_id: str        # the acting user (accepter / remover)
    other_id: str       # the other user in the friendship


# ── user search ───────────────────────────────────────────────────────────────

@router.get("/users/search")
def search_users(q: str = Query(..., min_length=1),
                 user_id: Optional[str] = Query(None),
                 conn: psycopg2.extensions.connection = Depends(get_conn)):
    """Search users by display name or email. `user_id` (the caller) is excluded."""
    return database_access.search_users(q, conn, exclude_user_id=user_id)


# ── friend requests ───────────────────────────────────────────────────────────

@router.post("/friends/request")
def send_request(body: FriendRequest,
                 conn: psycopg2.extensions.connection = Depends(get_conn)):
    if body.requester == body.recipient:
        raise HTTPException(400, "You can't add yourself as a friend")
    status = database_access.send_friend_request(body.requester, body.recipient, conn)
    return {"ok": True, "status": status}


@router.post("/friends/accept")
def accept_request(body: FriendAction,
                   conn: psycopg2.extensions.connection = Depends(get_conn)):
    # user_id accepts the request that other_id sent them
    database_access.accept_friend_request(body.user_id, body.other_id, conn)
    return {"ok": True}


@router.delete("/friends/{user_id}/{other_id}")
def remove_friend(user_id: str, other_id: str,
                  conn: psycopg2.extensions.connection = Depends(get_conn)):
    """Unfriend, cancel an outgoing request, or decline an incoming one."""
    database_access.remove_friendship(user_id, other_id, conn)
    return {"ok": True}


# ── friends overview ──────────────────────────────────────────────────────────

@router.get("/friends/{user_id}")
def get_friends(user_id: str,
                conn: psycopg2.extensions.connection = Depends(get_conn)):
    """Everything the Friends page needs: accepted friends plus pending requests."""
    return {
        "friends": database_access.get_friends(user_id, conn),
        "incoming": database_access.get_incoming_requests(user_id, conn),
        "outgoing": database_access.get_outgoing_requests(user_id, conn),
    }
