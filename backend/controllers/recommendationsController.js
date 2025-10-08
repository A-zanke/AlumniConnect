const User = require("../models/User");

// Very simple similarity scoring based on overlapping skills, department, interests
function computeSimilarity(student, alumni) {
  let score = 0;
  const studentSkills = new Set((student.skills || []).map((s) => String(s).toLowerCase()));
  const alumniSkills = new Set((alumni.skills || []).map((s) => String(s).toLowerCase()));
  for (const s of studentSkills) if (alumniSkills.has(s)) score += 3;
  if (student.department && alumni.department && String(student.department).toLowerCase() === String(alumni.department).toLowerCase()) score += 4;
  const interests = new Set((student.careerInterests || []).map((s) => String(s).toLowerCase()));
  for (const i of interests) if (alumniSkills.has(i)) score += 2;
  // small boost for same industry if stored in alumni
  if (student.industry && alumni.industry && String(student.industry).toLowerCase() === String(alumni.industry).toLowerCase()) score += 1;
  return score;
}

exports.getAlumniRecommendations = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).lean();
    if (!me) return res.status(404).json({ message: "User not found" });
    if (String(me.role).toLowerCase() !== "student") return res.json([]);

    const alumniList = await User.find({ role: "alumni" })
      .select("name username avatarUrl department graduationYear industry skills")
      .lean();

    const scored = alumniList
      .map((a) => ({
        user: a,
        score: computeSimilarity(me, a),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.user);

    res.json(scored);
  } catch (e) {
    console.error("getAlumniRecommendations error:", e);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};
