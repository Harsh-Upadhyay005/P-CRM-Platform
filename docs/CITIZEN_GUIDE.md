# Citizen Guide — How to Use P-CRM

> **P-CRM (Political Constituency Relationship Management)** is a free, government-run grievance portal.  
> You do **not** need to create an account. Filing a complaint and tracking it requires only your **Tracking ID**.

---

## Table of Contents

1. [Filing a Complaint](#1-filing-a-complaint)
2. [What Happens Immediately After You Submit](#2-what-happens-immediately-after-you-submit)
3. [How Your Complaint Is Processed](#3-how-your-complaint-is-processed)
4. [Tracking Your Complaint](#4-tracking-your-complaint)
5. [Understanding Status Labels](#5-understanding-status-labels)
6. [Submitting Feedback](#6-submitting-feedback)
7. [Frequently Asked Questions](#7-frequently-asked-questions)

---

## 1. Filing a Complaint

Go to the **Submit Complaint** page:

```
https://[your-site]/submit
```

No login or account is required.

### What to fill in

| Field         | Required | Description                                                                |
| ------------- | -------- | -------------------------------------------------------------------------- |
| Full Name     | ✅       | Your name as you would like it on the complaint                            |
| Phone Number  | ✅       | Office staff may use this to contact you if they need details              |
| Email Address | ⬜       | Optional — but recommended so we can send you your Tracking ID             |
| Category      | ✅       | Choose the area your problem falls under (e.g., Roads, Water, Electricity) |
| Description   | ✅       | Describe your problem in as much detail as possible                        |
| Attachments   | ⬜       | You may attach photos or documents (max 10 MB each, up to 5 files)         |

### Submitting

Click the **Submit Complaint** button. The form will process for a few seconds while your complaint is registered.

### Your Tracking ID

As soon as your complaint is submitted, you will receive a **Tracking ID** that looks like this:

```
PCRM-20260301-A4F7B3C2
```

**Save this ID.** It is the only way to check the status of your complaint without contacting the office.

- If you provided your email address, your Tracking ID will also be emailed to you.
- If you did not provide an email address, note it down immediately — the Tracking ID is shown only once on screen.

---

## 2. What Happens Immediately After You Submit

Your complaint does not sit in a queue — several things happen in the first few seconds:

1. **Unique Tracking ID is generated** — `PCRM-YYYYMMDD-XXXXXXXX`. Stored in our database and linked to your complaint.

2. **AI analysis runs automatically** — Our system scans your description to:
   - Assess the **urgency** (priority: Low / Medium / High / Critical)
   - Detect if a **similar complaint** has already been filed recently (to avoid duplicates)

3. **Initial status is set to `OPEN`** — Your complaint is now in the system.

4. **Office staff are notified in real-time** — A notification is pushed to the relevant staff members immediately, so your complaint is seen without delay.

5. **Email confirmation sent** (if you provided your email) — Includes your Tracking ID and a direct link to your tracking page.

---

## 3. How Your Complaint Is Processed

Here is the typical journey a complaint takes from submission to resolution:

```
You submit
    │
    ▼
[OPEN] ──► Office reviews your complaint
    │
    ▼
[ASSIGNED] ──► Sent to the correct department (e.g., Roads Department)
    │           SLA clock starts here (office has a deadline to resolve it)
    ▼
[IN_PROGRESS] ──► An officer is actively working on your issue
    │
    ▼
[RESOLVED] ──► Your issue has been addressed. You can submit feedback.
    │
    ▼
[CLOSED] ──► Complaint fully closed. Feedback window closes.
```

If the office does not act within the SLA deadline, the complaint is automatically **escalated**:

```
[ESCALATED] ──► Flagged as urgent. Senior staff are alerted immediately.
                After action is taken, it moves back to IN_PROGRESS or ASSIGNED.
```

### What is an SLA?

SLA stands for **Service Level Agreement** — it is a deadline by which the office must respond to or resolve your complaint. Each department has its own SLA (typically 48 hours). If the deadline is missed, the system automatically escalates the complaint and sends alerts to senior staff.

---

## 4. Tracking Your Complaint

You can check the status of your complaint at any time — no login required.

Go to:

```
https://[your-site]/track/PCRM-20260301-A4F7B3C2
```

Replace `PCRM-20260301-A4F7B3C2` with your own Tracking ID.

### What you can see on the tracking page

- **Current Status** — one of: OPEN, ASSIGNED, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED
- **Assigned Department** — which government department is handling your issue
- **Assigned Officer** — the name of the officer working on your complaint (once assigned)
- **SLA Deadline** — the date by which the office must resolve your complaint
- **Full Status Timeline** — a detailed history of every status change with timestamps, so you can see exactly what has happened and when
- **Feedback Form** — appears once the status reaches RESOLVED

---

## 5. Understanding Status Labels

| Status        | What it means for you                                                      |
| ------------- | -------------------------------------------------------------------------- |
| `OPEN`        | Your complaint has been received and is waiting for review by staff        |
| `ASSIGNED`    | Your complaint has been sent to the appropriate department                 |
| `IN_PROGRESS` | An officer is actively investigating or working on your issue              |
| `ESCALATED`   | Your complaint has been flagged as urgent — senior staff have been alerted |
| `RESOLVED`    | Your issue has been addressed. You may submit a satisfaction rating.       |
| `CLOSED`      | The complaint is fully closed. No further changes will be made.            |

> **Note:** If your complaint has been `ESCALATED`, this does not mean something went wrong. It means the system identified that the normal deadline was missed and automatically triggered a higher-priority review. This is designed to protect you.

---

## 6. Submitting Feedback

Once your complaint reaches **RESOLVED** or **CLOSED** status, a feedback form will appear on your tracking page.

### How to submit feedback

1. Open your tracking page at `https://[your-site]/track/[your-tracking-id]`
2. Scroll to the **Feedback** section at the bottom
3. Select a star rating (**1 to 5 stars**):
   - ⭐ — Very dissatisfied
   - ⭐⭐ — Dissatisfied
   - ⭐⭐⭐ — Neutral
   - ⭐⭐⭐⭐ — Satisfied
   - ⭐⭐⭐⭐⭐ — Very satisfied
4. Optionally write a short comment about your experience
5. Click **Submit Feedback**

**Important:**

- You can submit feedback **only once per complaint** — it cannot be changed after submission.
- Feedback helps the office improve their service and is reviewed by administrators.

---

## 7. Frequently Asked Questions

**Q: I lost my Tracking ID. What should I do?**  
A: First, check the email you provided when filing the complaint — your Tracking ID was sent there. If you did not provide an email (or cannot find the message), contact the office directly and provide your full name and phone number. A staff member can look up your complaint.

---

**Q: My complaint status has not changed for several days. What should I do?**  
A: If the SLA deadline has passed, the system automatically escalates your complaint and alerts senior staff. If you are still concerned, contact the office with your Tracking ID — they can provide an update.

---

**Q: I filed the same complaint twice by mistake. Will both be processed?**  
A: Our AI system automatically detects duplicate complaints. Staff are alerted when a similar complaint has already been filed. The duplicate will typically be merged with or closed in favour of your original submission. You do not need to take any action.

---

**Q: Does it cost anything to file a complaint?**  
A: No. The P-CRM service is completely free for all citizens.

---

**Q: Do I need to create an account or log in?**  
A: No. You do not need any account to file a complaint or track its status. Only government staff use the staff portal (which requires a login).

---

**Q: What kind of complaints can I file?**  
A: You can file complaints about any issue related to government services in your constituency — roads, water supply, electricity, sanitation, public infrastructure, health services, and more. Select the most appropriate category when submitting.

---

**Q: Will anyone contact me about my complaint?**  
A: Staff may contact you on the phone number you provided if they need additional details. You will also receive email updates (if you provided an email) when the status of your complaint changes.

---

**Q: How do I know my complaint was actually received?**  
A: As soon as you click Submit, a Tracking ID is shown on screen and emailed to you (if you provided your email). You can immediately visit your tracking page to confirm the complaint is registered with status `OPEN`.

---

**Q: Can I attach photos or documents to my complaint?**  
A: Yes. On the submission form you can attach up to **5 files** (photos, PDFs, documents). Each file must be under **10 MB**. Attachments help staff understand and resolve your issue faster.

---

_This guide is for citizens using the public complaint portal. Government staff should refer to the [User Guide](docs/USER_GUIDE.md)._  
_For technical information about the platform, see the [Platform Overview](docs/PLATFORM_OVERVIEW.md)._
