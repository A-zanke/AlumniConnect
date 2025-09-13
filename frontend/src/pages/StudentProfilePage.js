import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import ConnectionsPreview from '../components/profile/ConnectionsPreview';
import { userAPI } from '../components/utils/api';
import TagsInput from '../components/ui/TagsInput';

const StudentProfilePage = () => {
  const { userId, username } = useParams();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);

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
      name: user.name || '',
      bio: user.bio || '',
      phone: user.phone || '',
      location: user.location || '',
      specialization: user.specialization || '',
      projects: user.projects || [],
      desired_roles: user.desired_roles || [],
      preferred_industries: user.preferred_industries || [],
      higher_studies_interest: user.higher_studies_interest || 'Maybe',
      entrepreneurship_interest: user.entrepreneurship_interest || 'Maybe',
      internships: user.internships || [],
      hackathons: user.hackathons || [],
      research_papers: user.research_papers || [],
      mentorship_needs: user.mentorship_needs || [],
      socials: user.socials || { linkedin: '', github: '', twitter: '', website: '' },
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
        {(user.bio || editing) && (
          <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
            <div className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">About</h3>
            </div>
            <div className="p-6">
              {editing ? (
                <textarea className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700" rows={4} value={draft.bio} onChange={(e)=>setDraft(d=>({ ...d, bio: e.target.value }))} placeholder="Tell something about you" />
              ) : (
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{user.bio}</p>
              )}
              <div className="mt-4">
                {editing ? (
                  <TagsInput label="Skills" value={draft.skills || []} onChange={(vals)=>setDraft(d=>({ ...d, skills: vals }))} chipColor="indigo" />
                ) : (
                  Array.isArray(user.skills) && user.skills.length > 0 && (
                    <Chips label="Skills" items={user.skills} />
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
          <div className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-t-2xl">
            <h3 className="text-lg font-semibold">Academic & Goals</h3>
          </div>
          <div className="p-6 space-y-4">
            {editing ? (
              <>
                <LabeledInput label="Specialization" value={draft.specialization} onChange={(v)=>setDraft(d=>({ ...d, specialization: v }))} />
                <TagsInput label="Projects" value={draft.projects || []} onChange={(vals)=>setDraft(d=>({ ...d, projects: vals }))} chipColor="blue" />
                <TagsInput label="Desired Roles" value={draft.desired_roles || []} onChange={(vals)=>setDraft(d=>({ ...d, desired_roles: vals }))} chipColor="green" />
                <TagsInput label="Preferred Industries" value={draft.preferred_industries || []} onChange={(vals)=>setDraft(d=>({ ...d, preferred_industries: vals }))} chipColor="purple" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectInput label="Higher Studies" value={draft.higher_studies_interest} onChange={(v)=>setDraft(d=>({ ...d, higher_studies_interest: v }))} options={["Yes","No","Maybe"]} />
                  <SelectInput label="Entrepreneurship" value={draft.entrepreneurship_interest} onChange={(v)=>setDraft(d=>({ ...d, entrepreneurship_interest: v }))} options={["Yes","No","Maybe"]} />
                </div>
              </>
            ) : (
              <>
                {user.specialization && <Info label="Specialization" value={user.specialization} />}
                {user.projects?.length > 0 && <Chips label="Projects" items={user.projects} />}
                {user.desired_roles?.length > 0 && <Chips label="Desired Roles" items={user.desired_roles} />}
                {user.preferred_industries?.length > 0 && <Chips label="Preferred Industries" items={user.preferred_industries} />}
              </>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!editing && user.higher_studies_interest && <Info label="Higher Studies" value={user.higher_studies_interest} />}
              {!editing && user.entrepreneurship_interest && <Info label="Entrepreneurship" value={user.entrepreneurship_interest} />}
            </div>
          </div>
        </div>

        <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
          <div className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-t-2xl">
            <h3 className="text-lg font-semibold">Experience</h3>
          </div>
          <div className="p-6 space-y-4">
            {editing ? (
              <>
                <TagsInput label="Internships" value={draft.internships || []} onChange={(vals)=>setDraft(d=>({ ...d, internships: vals }))} chipColor="indigo" />
                <TagsInput label="Hackathons" value={draft.hackathons || []} onChange={(vals)=>setDraft(d=>({ ...d, hackathons: vals }))} chipColor="blue" />
                <TagsInput label="Research Papers" value={draft.research_papers || []} onChange={(vals)=>setDraft(d=>({ ...d, research_papers: vals }))} chipColor="purple" />
              </>
            ) : (
              <>
                {user.internships?.length > 0 && <Chips label="Internships" items={user.internships} />}
                {user.hackathons?.length > 0 && <Chips label="Hackathons" items={user.hackathons} />}
                {user.research_papers?.length > 0 && <Chips label="Research Papers" items={user.research_papers} />}
              </>
            )}
          </div>
        </div>

        {(user.mentorship_needs?.length > 0 || editing) && (
          <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
            <div className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Mentorship Needs</h3>
            </div>
            <div className="p-6">
              {editing ? (
                <TagsInput label="Mentorship Needs" value={draft.mentorship_needs || []} onChange={(vals)=>setDraft(d=>({ ...d, mentorship_needs: vals }))} chipColor="green" />
              ) : (
                <Chips items={user.mentorship_needs} />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-6">
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const tabs = [
    { id: 'about', label: 'About', content: About }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-sky-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8">
      <div className="container">
        <ProfileHeader user={{ ...user }} />
        <div className="flex justify-end mb-4 gap-2">
          {!editing ? (
            <button onClick={startEdit} className="px-4 py-2 rounded-xl bg-slate-800 text-white">Edit Profile</button>
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

const Info = ({ label, value }) => (
  <div>
    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</span>
    <p className="text-gray-900 dark:text-gray-100">{value}</p>
  </div>
);

const Chips = ({ label, items }) => (
  <div>
    {label && <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</span>}
    <div className="flex flex-wrap gap-2 mt-2">
      {(items || []).map((item, idx) => (
        <span key={`${item}-${idx}`} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          {item}
        </span>
      ))}
    </div>
  </div>
);

const LabeledInput = ({ label, value, onChange }) => (
  <div>
    <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</div>
    <input value={value} onChange={(e)=>onChange(e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700" />
  </div>
);

const SelectInput = ({ label, value, onChange, options }) => (
  <div>
    <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</div>
    <select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700">
      {options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
    </select>
  </div>
);

export default StudentProfilePage;

