import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import ConnectionsPreview from '../components/profile/ConnectionsPreview';
import PostsFeed from '../components/profile/PostsFeed';
import { userAPI } from '../components/utils/api';

const AlumniProfilePage = () => {
  const { userId, username } = useParams();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        let res;
        if (username) res = await userAPI.getUserByUsername(username);
        else if (userId) res = await userAPI.getUserById(userId);
        setUser(res.data?.data || res.data);
      } catch (_) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId, username]);

  if (loading) return <div className="flex justify-center py-20">Loading...</div>;
  if (!user) return <div className="flex justify-center py-20">Profile not found</div>;

  const startEdit = () => {
    setDraft({
      bio: user.bio || '',
      current_job_title: user.current_job_title || '',
      company: user.company || '',
      industry: user.industry || '',
      mentorship_interests: user.mentorship_interests || [],
      certifications: user.certifications || [],
      publications: user.publications || [],
      skills: user.skills || []
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      const { userAPI } = await import('../components/utils/api');
      await userAPI.updateProfile(draft);
      setUser(prev => ({ ...prev, ...draft }));
      setEditing(false);
    } catch (_) {}
  };

  const About = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Section title="About">
          {editing ? (
            <textarea className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700" rows={4} value={draft.bio} onChange={(e)=>setDraft(d=>({ ...d, bio: e.target.value }))} />
          ) : (
            user.bio && <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-4">{user.bio}</p>
          )}
          <div className="mt-2">
            {editing ? (
              <LabeledInput label="Skills (comma separated)" value={(draft.skills||[]).join(', ')} onChange={(v)=>setDraft(d=>({ ...d, skills: v.split(',').map(x=>x.trim()).filter(Boolean) }))} />
            ) : (
              Array.isArray(user.skills) && user.skills.length > 0 && <Chips label="Skills" items={user.skills} color="purple" />
            )}
          </div>
        </Section>

        <Section title="Career">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editing ? (
              <>
                <LabeledInput label="Current Job Title" value={draft.current_job_title} onChange={(v)=>setDraft(d=>({ ...d, current_job_title: v }))} />
                <LabeledInput label="Company" value={draft.company} onChange={(v)=>setDraft(d=>({ ...d, company: v }))} />
                <LabeledInput label="Industry" value={draft.industry} onChange={(v)=>setDraft(d=>({ ...d, industry: v }))} />
              </>
            ) : (
              <>
                {user.current_job_title && <Info label="Current Job Title" value={user.current_job_title} />}
                {user.company && <Info label="Company" value={user.company} />}
                {user.industry && <Info label="Industry" value={user.industry} />}
              </>
            )}
          </div>
        </Section>

        <Section title="Mentorship & Achievements">
          {editing ? (
            <>
              <LabeledInput label="Mentorship Interests (comma separated)" value={(draft.mentorship_interests||[]).join(', ')} onChange={(v)=>setDraft(d=>({ ...d, mentorship_interests: v.split(',').map(x=>x.trim()).filter(Boolean) }))} />
              <LabeledInput label="Certifications (comma separated)" value={(draft.certifications||[]).join(', ')} onChange={(v)=>setDraft(d=>({ ...d, certifications: v.split(',').map(x=>x.trim()).filter(Boolean) }))} />
              <LabeledInput label="Publications (comma separated)" value={(draft.publications||[]).join(', ')} onChange={(v)=>setDraft(d=>({ ...d, publications: v.split(',').map(x=>x.trim()).filter(Boolean) }))} />
            </>
          ) : (
            <>
              {user.mentorship_interests?.length > 0 && <Chips label="Mentorship Interests" items={user.mentorship_interests} color="green" />}
              {user.certifications?.length > 0 && <Chips label="Certifications" items={user.certifications} color="yellow" />}
              {user.publications?.length > 0 && <Chips label="Publications" items={user.publications} color="indigo" />}
            </>
          )}
        </Section>
      </div>
      <div className="space-y-6">
        <Section title="Skills">
          <Chips items={user.skills || []} color="purple" />
        </Section>
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const Skills = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Section title="Skills">
          <Chips items={user.skills || []} color="purple" />
        </Section>
      </div>
      <div className="space-y-6">
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const Experience = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Section title="Experience">
          {user.past_experience?.length > 0 ? (
            <Chips items={user.past_experience} color="blue" />
          ) : (
            <p className="text-gray-700 dark:text-gray-200">Add your experience history, roles, and accomplishments.</p>
          )}
        </Section>
      </div>
      <div className="space-y-6">
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const Posts = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PostsFeed userId={user._id} />
      </div>
      <div className="space-y-6">
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const tabs = [
    { id: 'about', label: 'About', content: About },
    { id: 'skills', label: 'Skills', content: Skills },
    { id: 'experience', label: 'Experience', content: Experience },
    { id: 'posts', label: 'Posts', content: Posts }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8">
      <div className="container">
        <ProfileHeader user={{ ...user }} />
        <div className="flex justify-end mb-4 gap-2">
          {!editing ? (
            <button onClick={startEdit} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Edit Profile</button>
          ) : (
            <>
              <button onClick={()=>setEditing(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-xl bg-green-600 text-white">Save Changes</button>
            </>
          )}
        </div>
        <ProfileTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
    <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="p-6 space-y-3">{children}</div>
  </div>
);

const Info = ({ label, value }) => (
  <div>
    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</span>
    <p className="text-gray-900 dark:text-gray-100">{value}</p>
  </div>
);

const Chips = ({ label, items, color }) => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
  };
  return (
    <div>
      {label && <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</span>}
      <div className="flex flex-wrap gap-2 mt-2">
        {(items || []).map((item, idx) => (
          <span key={`${item}-${idx}`} className={`px-3 py-1 rounded-full text-sm ${colorMap[color] || colorMap.blue}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const LabeledInput = ({ label, value, onChange }) => (
  <div>
    <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</div>
    <input value={value} onChange={(e)=>onChange(e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700" />
  </div>
);

export default AlumniProfilePage;

