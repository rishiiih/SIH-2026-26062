import asyncio
import json
import time
from typing import AsyncGenerator, Dict, List, Optional, Set


class SOSEventBus:
    def __init__(self, max_history: int = 200):
        self.subscribers: Set[asyncio.Queue] = set()
        self.history: List[Dict] = []
        self.max_history = max_history
        self.counter = 0

    def publish(self, event_name: str, data: dict) -> int:
        self.counter += 1
        event_id = self.counter
        event_record = {
            "id": event_id,
            "event": event_name,
            "data": data,
            "timestamp": time.time(),
        }

        self.history.append(event_record)
        if len(self.history) > self.max_history:
            self.history.pop(0)

        # Notify active subscriber queues
        dead_queues = set()
        for q in list(self.subscribers):
            try:
                q.put_nowait(event_record)
            except Exception:
                dead_queues.add(q)

        self.subscribers.difference_update(dead_queues)
        return event_id

    async def stream_events(
        self,
        last_event_id: Optional[str] = None,
        heartbeat_interval: float = 5.0,
        max_events: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        queue = asyncio.Queue(maxsize=100)
        self.subscribers.add(queue)
        yielded = 0

        try:
            # Replay missed events from history if Last-Event-ID provided
            if last_event_id is not None:
                try:
                    last_id = int(last_event_id)
                    missed = [evt for evt in self.history if evt["id"] > last_id]
                    for evt in missed:
                        yield f"id: {evt['id']}\nevent: {evt['event']}\ndata: {json.dumps(evt['data'])}\n\n"
                        yielded += 1
                        if max_events is not None and yielded >= max_events:
                            return
                except (ValueError, TypeError):
                    pass

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                    yield f"id: {event['id']}\nevent: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
                    yielded += 1
                    if max_events is not None and yielded >= max_events:
                        return
                except asyncio.TimeoutError:
                    # Heartbeat comment every 5s
                    yield ": heartbeat\n\n"
                except (asyncio.CancelledError, GeneratorExit):
                    break
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            self.subscribers.discard(queue)




sos_event_bus = SOSEventBus()
