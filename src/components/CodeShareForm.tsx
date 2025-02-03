import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';

interface CodeShareFormProps {
  onSuccess: () => void;
}

interface Folder {
  id: string;
  name: string;
  is_chapter: boolean;
  year_level: string | null;
  parent_id: string | null;
}

const SUPPORTED_LANGUAGES = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'php', label: 'PHP' }
];

const YEAR_LEVELS = [
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' }
];

export function CodeShareForm({ onSuccess }: CodeShareFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('');
  const [codeContent, setCodeContent] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [newChapterName, setNewChapterName] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [chapters, setChapters] = useState<Folder[]>([]);
  const [exercises, setExercises] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (yearLevel) {
      loadChapters(yearLevel);
    }
  }, [yearLevel]);

  useEffect(() => {
    if (selectedChapter) {
      loadExercises(selectedChapter);
    } else {
      setExercises([]);
    }
  }, [selectedChapter]);

  async function loadChapters(year: string) {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('year_level', year)
        .eq('is_chapter', true)
        .order('name');

      if (error) throw error;
      setChapters(data || []);
    } catch (error: any) {
      console.error('Error loading chapters:', error);
      setError(error.message);
    }
  }

  async function loadExercises(chapterId: string) {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('parent_id', chapterId)
        .eq('is_exercise', true)
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error: any) {
      console.error('Error loading exercises:', error);
      setError(error.message);
    }
  }

  async function createFolder(name: string, isChapter: boolean, parentId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('folders')
        .insert([{
          name: name.trim(),
          year_level: yearLevel,
          is_chapter: isChapter,
          is_exercise: !isChapter,
          parent_id: parentId || null,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !language || !codeContent || !yearLevel) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      let finalChapterId = selectedChapter;
      let finalExerciseId = selectedExercise;

      // Create chapter if new chapter name is provided
      if (newChapterName && !selectedChapter) {
        const chapter = await createFolder(newChapterName, true);
        finalChapterId = chapter.id;
        setChapters([...chapters, chapter]);
      }

      // Create exercise if new exercise name is provided
      if (newExerciseName && finalChapterId) {
        const exercise = await createFolder(newExerciseName, false, finalChapterId);
        finalExerciseId = exercise.id;
        setExercises([...exercises, exercise]);
      }

      // Create code snippet
      const { error: snippetError } = await supabase
        .from('code_snippets')
        .insert([{
          title,
          description,
          language,
          code_content: codeContent,
          folder_id: finalExerciseId || finalChapterId,
          user_id: user.id
        }]);

      if (snippetError) throw snippetError;

      // Reset form
      setTitle('');
      setDescription('');
      setLanguage('');
      setCodeContent('');
      setYearLevel('');
      setSelectedChapter('');
      setNewChapterName('');
      setSelectedExercise('');
      setNewExerciseName('');

      onSuccess();
    } catch (error: any) {
      console.error('Error sharing code:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Year Level *
        </label>
        <select
          value={yearLevel}
          onChange={(e) => setYearLevel(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        >
          <option value="">Select Year Level</option>
          {YEAR_LEVELS.map(year => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>
      </div>

      {yearLevel && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Chapter
            </label>
            <div className="mt-1 space-y-2">
              <select
                value={selectedChapter}
                onChange={(e) => {
                  setSelectedChapter(e.target.value);
                  setNewChapterName('');
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select or create new chapter</option>
                {chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
              {!selectedChapter && (
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="Or enter new chapter name"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              )}
            </div>
          </div>

          {(selectedChapter || newChapterName) && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Exercise
              </label>
              <div className="mt-1 space-y-2">
                <select
                  value={selectedExercise}
                  onChange={(e) => {
                    setSelectedExercise(e.target.value);
                    setNewExerciseName('');
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select or create new exercise</option>
                  {exercises.map(exercise => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                {!selectedExercise && (
                  <input
                    type="text"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    placeholder="Or enter new exercise name"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Programming Language *
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        >
          <option value="">Select Language</option>
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Code Content *
        </label>
        <textarea
          value={codeContent}
          onChange={(e) => setCodeContent(e.target.value)}
          rows={10}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono"
          required
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Share Code'}
        </button>
      </div>
    </form>
  );
}
