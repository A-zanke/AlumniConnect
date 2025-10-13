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

    // Show all alumni profiles from the database
    const alumniList = await User.find({ role: "alumni" })
      .select("name username avatarUrl department graduationYear industry skills careerInterests company")
      .lean();

    // Return all alumni profiles without filtering or scoring
    res.json(alumniList);
  } catch (e) {
    console.error("getAlumniRecommendations error:", e);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};
