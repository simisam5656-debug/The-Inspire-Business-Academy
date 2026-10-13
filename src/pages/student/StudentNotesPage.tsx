import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { StudentLmsService } from '../../services/studentLmsService';
import { StudentNote } from '../../types';
import { FileText, Search, ExternalLink, Calendar, Trash2, Edit3, Save, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const StudentNotesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotes() {
      if (!user?.id) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        const list = await StudentLmsService.getAllStudentNotes(user.id);
        setNotes(list);
      } catch (err: any) {
        console.error('Failed to load notes', err);
        setErrorMessage(err?.message || (isRoman ? 'Notes load karne mein masla pesh aya.' : 'Failed to load study notes.'));
      } finally {
        setLoading(false);
      }
    }
    loadNotes();
  }, [user?.id, isRoman]);

  const handleStartEdit = (note: StudentNote) => {
    setEditingNoteId(note.id);
    setEditText(note.noteText);
    setErrorMessage(null);
  };

  const handleSaveEdit = async (note: StudentNote) => {
    if (!user?.id) return;
    setErrorMessage(null);
    try {
      await StudentLmsService.saveLessonNote(
        user.id,
        note.courseId,
        note.lessonId,
        editText,
        note.lessonTitle
      );
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, noteText: editText, updatedAt: new Date().toISOString() } : n))
      );
      setEditingNoteId(null);
      setSavedSuccessId(note.id);
      setTimeout(() => setSavedSuccessId(null), 2500);
    } catch (err: any) {
      console.error('Error saving edited note', err);
      setErrorMessage(err?.message || (isRoman ? 'Note mehfooz karne mein masla pesh aya.' : 'Failed to save note.'));
    }
  };

  const handleDelete = async (note: StudentNote) => {
    if (!user?.id) return;
    setDeletingId(note.id);
    setErrorMessage(null);
    try {
      await StudentLmsService.deleteLessonNote(user.id, note.lessonId);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err: any) {
      console.error('Error deleting note', err);
      setErrorMessage(err?.message || (isRoman ? 'Note hazf karne mein masla pesh aya.' : 'Failed to delete note.'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredNotes = notes.filter((n) =>
    (n.noteText || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.lessonTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title={isRoman ? 'Zaati Notes - The Inspire Business Academy' : 'Personal Study Notes - The Inspire Academy LMS'}
        description="Search, view, and organize your private study notes taken during online lessons."
        canonicalPath="/student/notes"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Aapke Zaati Study Notes' : 'Personal Study Notes'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {isRoman
              ? 'Darsgah mein video dekhte waqt likhe gaye tamam private notes yahan mehfooz hain.'
              : 'All private timestamps, reminders, and summaries saved during your video lessons.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRoman ? 'Notes mein talash karein...' : 'Search study notes...'}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1F3FBF]"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-900 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">
            {isRoman ? 'Notes load ho rahe hain...' : 'Loading notes...'}
          </p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1F3FBF] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#0F1F5C]">
            {isRoman ? 'Filhal Koi Notes Mehfooz Nahi Hain' : 'No Study Notes Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isRoman
              ? 'Classroom mein kisi bhi video sabaq ke niche "Zaati Notes" tab mein ja kar apne ahem nukat mehfooz karein.'
              : 'While watching any lesson in the Classroom, click the "Personal Notes" tab to jot down key takeaways.'}
          </p>
          <div className="pt-2">
            <Link
              to="/student/classroom"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F3FBF] text-white text-xs font-bold rounded-xl hover:bg-[#0F1F5C] transition-colors"
            >
              <span>{isRoman ? 'Classroom Kholein' : 'Go to Classroom'}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-[#1F3FBF]/30 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-[#0F1F5C] truncate max-w-[200px]">
                      {note.lessonTitle || 'Lesson'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={5}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F3FBF]"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {note.noteText}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to="/student/classroom"
                    className="text-[11px] font-semibold text-[#1F3FBF] hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {isRoman ? 'Sabaq par jayein' : 'Open Lesson'}
                  </Link>

                  <div className="flex items-center gap-2">
                    {savedSuccessId === note.id && (
                      <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Saved!
                      </span>
                    )}

                    {isEditing ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveEdit(note)}
                        className="text-xs bg-[#1F3FBF] hover:bg-[#0F1F5C] px-3 py-1"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {isRoman ? 'Save' : 'Save'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(note)}
                          className="text-xs text-slate-500 hover:text-[#0F1F5C] px-2 py-1"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          {isRoman ? 'Edit' : 'Edit'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === note.id}
                          onClick={() => handleDelete(note)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {isRoman ? 'Hazf' : 'Delete'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
