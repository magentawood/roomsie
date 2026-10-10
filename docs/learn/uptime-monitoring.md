# Uptime monitoring

**In one line:** HetrixTools calls the health check of the API each minute. When the API stops, it sends an alert to the Telegram group of the team.

## What it is

An **uptime monitor** is a service on a different network. It calls an address at a fixed interval. When the address does not reply correctly, the monitor sends an alert. When the address replies correctly again, the monitor sends a second alert.

Thus, the team knows about a stopped API before users tell the team.

## How it fits our project

```
HetrixTools ── each minute ──▶ https://api.roomsie.in/v1/health ──▶ {"status":"ok"}
     │
     └── no reply or an error status ──▶ Telegram group of the team
```

| Item | Value |
|---|---|
| The service | HetrixTools, free plan, account "Roomsie" |
| The address | `https://api.roomsie.in/v1/health` |
| The interval | 1 minute |
| The check | The HTTP status. The free plan has no keyword check. |
| The alerts | The Telegram group of the team. HetrixTools has the chat ID of the group. |

- The deploy workflow calls the same health check after each deploy ([Deploys](deploys.md)).
- The monitor waits for some failed checks before it sends an alert. In the test, the "down" alert came in 2 to 3 minutes.
- The spend alert is not part of this monitor. T-21 makes it ([PD9](../decisions/pd-09-pre-login-limits.md)).

## The choice we made

- **A hosted monitor, not a monitor on our servers.** A monitor on the API host can stop at the same time as the API ([ADR-0014](../decisions/0014-error-tracking.md)).
- **HetrixTools.** Its free plan checks each minute and sends alerts to Telegram. Other free plans check each 3 or 5 minutes.
- **Telegram.** The team reads the group, and each phone gets a notification.
- **A sub-account for each team member.** The team does not share one login ([ADR-0016](../decisions/0016-credentials-and-secrets.md)).

## Gotchas

- To test the alerts, change the address to a wrong port, for example `https://api.roomsie.in:81/v1/health`. Wait for the "down" alert. Then put the correct address back, and wait for the "up" alert.
- A deploy of the API can give a short "down" alert and then an "up" alert. This is usual.
- The monitor does not check the web at `roomsie.in`. A problem with Vercel or the DNS gives no alert.
