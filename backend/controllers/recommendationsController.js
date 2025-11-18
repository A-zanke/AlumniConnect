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

    console.log("Fetching recommendations for user:", me.name, "Role:", me.role);

    // Only students get recommendations
    if (String(me.role).toLowerCase() !== "student") {
      console.log("User is not a student, returning empty array");
      return res.json([]);
    }

    // Check if student profile is complete enough for recommendations
    const hasSkills = Array.isArray(me.skills) && me.skills.length > 0;
    const hasInterests = Array.isArray(me.careerInterests) && me.careerInterests.length > 0;
    const hasDepartment = me.department && String(me.department).trim().length > 0;
    
    if (!hasSkills && !hasInterests && !hasDepartment) {
      console.log("Student profile incomplete - no skills, interests, or department");
      return res.json([]);
    }

    // Get all alumni profiles from the database - try multiple role variations
    const alumniList = await User.find({ 
      role: { $in: ["alumni", "Alumni", "ALUMNI"] },
      _id: { $ne: req.user._id } // Exclude self
    })
      .select("name username avatarUrl department graduationYear industry skills careerInterests company position")
      .lean();

    console.log("Found alumni count:", alumniList.length);

    if (alumniList.length === 0) {
      console.log("No alumni found in database");
      return res.json([]);
    }

    // Calculate similarity score for each alumni
    const scoredAlumni = alumniList.map((alumni) => {
      const { score, matchDetails } = computeSimilarity(me, alumni);
      
      // Convert raw score to percentage (0-100%)
      // Max possible score is ~40 points (skills + department + interests + industry + year)
      const maxScore = 40;
      const normalizedScore = Math.min(100, Math.max(0, (score / maxScore) * 100));
      
      console.log(`Alumni ${alumni.name}: rawScore=${score}, matchScore=${normalizedScore.toFixed(1)}%, matches:`, matchDetails);
      
      return {
        ...alumni,
        matchScore: normalizedScore,
        matchDetails,
        rawScore: score
      };
    });

    // Filter out alumni with 0 score (no match at all)
    const matchedAlumni = scoredAlumni.filter(a => a.rawScore > 0);
    
    // Sort by score descending
    matchedAlumni.sort((a, b) => b.rawScore - a.rawScore);

    console.log(`Found ${matchedAlumni.length} alumni with actual matches out of ${alumniList.length} total`);
    
    res.json(matchedAlumni);
  } catch (e) {
    console.error("getAlumniRecommendations error:", e);
    res.status(500).json({ message: "Failed to fetch recommendations", error: e.message });
  }
};
