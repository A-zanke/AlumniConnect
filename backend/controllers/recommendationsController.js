const User = require("../models/User");

// Enhanced similarity scoring - only show matches above threshold
function computeSimilarity(student, alumni) {
  let score = 0;
  let matchDetails = {
    skillsMatch: 0,
    departmentMatch: false,
    interestsMatch: 0,
    industryMatch: false,
    yearProximity: 0
  };

  // Skills matching (5 points per match - higher weight)
  const studentSkills = new Set((student.skills || []).map((s) => String(s).toLowerCase().trim()));
  const alumniSkills = new Set((alumni.skills || []).map((s) => String(s).toLowerCase().trim()));
  
  for (const s of studentSkills) {
    if (alumniSkills.has(s)) {
      score += 5;
      matchDetails.skillsMatch++;
    }
  }

  // Department matching (8 points - very important)
  if (student.department && alumni.department && 
      String(student.department).toLowerCase().trim() === String(alumni.department).toLowerCase().trim()) {
    score += 8;
    matchDetails.departmentMatch = true;
  }

  // Career interests matching (4 points per match)
  const interests = new Set((student.careerInterests || []).map((s) => String(s).toLowerCase().trim()));
  for (const i of interests) {
    if (alumniSkills.has(i)) {
      score += 4;
      matchDetails.interestsMatch++;
    }
  }

  // Industry matching (3 points)
  if (student.industry && alumni.industry && 
      String(student.industry).toLowerCase().trim() === String(alumni.industry).toLowerCase().trim()) {
    score += 3;
    matchDetails.industryMatch = true;
  }

  // Graduation year proximity bonus (2 points if within 3 years)
  if (student.graduationYear && alumni.graduationYear) {
    const yearDiff = Math.abs(parseInt(student.graduationYear) - parseInt(alumni.graduationYear));
    if (yearDiff <= 3) {
      score += 2;
      matchDetails.yearProximity = yearDiff;
    }
  }

  return { score, matchDetails };
}

exports.getAlumniRecommendations = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).lean();
    if (!me) return res.status(404).json({ message: "User not found" });

    // Only students get recommendations
    if (String(me.role).toLowerCase() !== "student") {
      return res.json([]);
    }

    const alumniList = await User.find({ role: "alumni" })
      .select("name username avatarUrl department graduationYear industry skills careerInterests")
      .lean();

    // Calculate similarity scores for all alumni
    const scored = alumniList
      .map((a) => {
        const { score, matchDetails } = computeSimilarity(me, a);
        return {
          ...a,
          _id: String(a._id),
          similarityScore: score,
          matchDetails
        };
      })
      .filter((x) => x.similarityScore >= 5) // **THRESHOLD: Only show if score >= 5 (at least one meaningful match)**
      .sort((a, b) => b.similarityScore - a.similarityScore);

    // Return only matched alumni (max 15 to avoid overwhelming UI)
    const recommendations = scored.slice(0, 15);

    // Enrich with connection status
    const enriched = await Promise.all(recommendations.map(async (rec) => {
      const other = await User.findById(rec._id).lean();
      if (!other) return { ...rec, status: 'none' };

      const isConnected = (me.connections || []).some(id => id.toString() === rec._id) &&
                          (other.connections || []).some(id => id.toString() === me._id.toString());
      if (isConnected) return { ...rec, status: 'connected' };

      const iRequestedOther = (other.connectionRequests || []).some(id => id.toString() === me._id.toString());
      if (iRequestedOther) return { ...rec, status: 'requested' };

      const otherRequestedMe = (me.connectionRequests || []).some(id => id.toString() === rec._id);
      if (otherRequestedMe) return { ...rec, status: 'incoming' };

      return { ...rec, status: 'none' };
    }));

    res.json(enriched);
  } catch (e) {
    console.error("getAlumniRecommendations error:", e);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};
