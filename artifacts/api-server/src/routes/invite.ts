import { Router } from "express";

const router = Router();

router.post("/validate-instructor-code", (req, res) => {
  const { code } = req.body as { code?: string };
  const correctCode = process.env.INSTRUCTOR_INVITE_CODE;

  if (!correctCode) {
    res.status(500).json({ valid: false, error: "Invite code not configured on server." });
    return;
  }

  if (!code || code.trim() !== correctCode) {
    res.status(200).json({ valid: false });
    return;
  }

  res.status(200).json({ valid: true });
});

export default router;
