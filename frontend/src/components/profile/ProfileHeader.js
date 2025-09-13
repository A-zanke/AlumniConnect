import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiMapPin, FiLinkedin, FiGithub, FiGlobe, FiUserPlus, FiUserCheck, FiMessageCircle, FiPhone, FiEdit2 } from 'react-icons/fi';
import { getAvatarUrl } from '../utils/helpers';
import { followAPI, userAPI } from '../utils/api';
import { useAuth } from '../../context/AuthContext';

const roleGradientMap = {
  student: 'from-slate-900 via-slate-700 to-slate-500',
  teacher: 'from-stone-900 via-stone-700 to-stone-500',
  alumni: 'from-zinc-900 via-zinc-700 to-zinc-500'
};

const ProfileHeader = ({ user, coverGradient = undefined }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(Array.isArray(user.followers) ? user.followers.length : 0);
  const [followingCount, setFollowingCount] = useState(Array.isArray(user.following) ? user.following.length : 0);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followingList, setFollowingList] = useState([]);

  const isOwn = currentUser?._id === user?._id;

  useEffect(() => {
    if (!currentUser || !user) return;
    try {
      const mine = (currentUser.following || []).map(i => i?.toString?.() || i);
      setIsFollowing(mine.includes(user._id));
    } catch (_) {}
    setFollowersCount(Array.isArray(user.followers) ? user.followers.length : 0);
    setFollowingCount(Array.isArray(user.following) ? user.following.length : 0);
  }, [currentUser, user]);

  const loadFollowing = async () => {
    try {
      const res = await followAPI.getFollowing(user._id);
      const data = res?.data?.data || [];
      setFollowingList(Array.isArray(data) ? data : []);
    } catch (_) {
      setFollowingList([]);
    }
  };

  const handleFollowToggle = async () => {
    if (!user?._id || isOwn) return;
    try {
      const res = await followAPI.followUser(user._id);
      if (res?.data?.isFollowing === true) {
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
      } else if (res?.data?.isFollowing === false) {
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
      } else {
        setIsFollowing(prev => !prev);
        setFollowersCount(c => Math.max(0, c + (isFollowing ? -1 : 1)));
      }
    } catch (_) {}
  };

  const hasAnySocial = useMemo(() => {
    const s = user?.socials || {};
    return Boolean(s.linkedin || s.github || s.website) || Boolean(user.linkedin || user.github || user.website);
  }, [user]);

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6 border border-stone-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="relative">
        <div className={`h-48 bg-gradient-to-r ${coverGradient || roleGradientMap[(user?.role || '').toLowerCase()] || roleGradientMap.student}`}></div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-6">
          <div className="flex flex-col md:flex-row items-center md:items-end">
            <div className="relative mb-4 md:mb-0">
              {user?.avatarUrl ? (
                <img className="h-28 w-28 rounded-full border-4 border-white shadow-2xl object-cover" src={getAvatarUrl(user.avatarUrl)} alt={user.name} />
              ) : (
                <div className="h-28 w-28 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-2xl">
                  <span className="text-3xl font-bold text-indigo-600">{user?.name?.charAt(0)?.toUpperCase?.()}</span>
                </div>
              )}
              {/* Avatar upload (opens native file picker, relies on existing update in ProfilePage) */}
              <label className="absolute bottom-2 right-2 cursor-pointer bg-white/80 text-indigo-700 rounded-full p-2 hover:bg-white">
                <FiEdit2 />
                <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // Defer to ProfilePage's edit flow if present; otherwise ignore
                }} />
              </label>
            </div>
            <div className="md:ml-6 text-center md:text-left text-white">
              <h1 className="text-3xl font-bold mb-1">{user?.name}</h1>
              {!!user?.email && <p className="opacity-90">{user.email}</p>}
              {!!user?.username && <p className="opacity-80 text-sm">@{user.username}</p>}
              <div className="mt-1">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs capitalize">{user?.role}</span>
              </div>
            </div>
            <div className="md:ml-auto mt-4 md:mt-0 flex items-center gap-3">
              {!isOwn && (
                <>
                  <button
                    onClick={() => navigate(`/messages?user=${user?._id}`)}
                    className="flex items-center px-4 py-2 rounded-xl transition-colors bg-white/20 text-white hover:bg-white/30 border border-white/30"
                  >
                    <FiMessageCircle className="mr-2" /> Message
                  </button>
                  <button
                    onClick={handleFollowToggle}
                    className={`flex items-center px-4 py-2 rounded-xl transition-colors ${isFollowing ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90'}`}
                  >
                    {isFollowing ? <FiUserCheck className="mr-2" /> : <FiUserPlus className="mr-2" />} {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center text-sm text-gray-700 dark:text-gray-200"><FiMail className="text-indigo-600 mr-2" /> {user?.email}</div>
        {!!user?.phone && (
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-200"><FiPhone className="text-indigo-600 mr-2" /> {user.phone}</div>
        )}
        {!!user?.location && (
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-200"><FiMapPin className="text-indigo-600 mr-2" /> {user.location}</div>
        )}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-700 dark:text-gray-200"><strong>{followersCount}</strong> Followers</span>
          <button
            className="text-gray-700 dark:text-gray-200 hover:underline"
            onClick={async () => { await loadFollowing(); setShowFollowing(true); }}
          >
            <strong>{followingCount}</strong> Following
          </button>
        </div>
      </div>

      {hasAnySocial && (
        <div className="px-6 pb-6 flex flex-wrap items-center gap-3">
          {user?.socials?.linkedin || user?.linkedin ? (
            <a href={user?.socials?.linkedin || user?.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm">
              <FiLinkedin className="mr-2" /> LinkedIn
            </a>
          ) : null}
          {user?.socials?.github || user?.github ? (
            <a href={user?.socials?.github || user?.github} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 text-gray-800 border border-gray-200 text-sm">
              <FiGithub className="mr-2" /> GitHub
            </a>
          ) : null}
          {user?.socials?.website || user?.website ? (
            <a href={user?.socials?.website || user?.website} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-sm">
              <FiGlobe className="mr-2" /> Website
            </a>
          ) : null}
        </div>
      )}

      {showFollowing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h4 className="font-semibold">Following</h4>
              <button className="text-sm px-3 py-1 rounded-lg border" onClick={() => setShowFollowing(false)}>Close</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {followingList.length === 0 ? (
                <div className="p-4 text-sm text-gray-600 dark:text-gray-300">No following to show.</div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                  {followingList.map((u) => (
                    <li key={u._id} className="p-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {u?.name?.[0]?.toUpperCase?.()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-gray-500">@{u.username}</div>
                      </div>
                      <button
                        onClick={() => {
                          setShowFollowing(false);
                          navigate(`/profile/${u.username || u._id}`);
                        }}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;

