import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { saveAs } from 'file-saver';
import { FolderTagManager } from '../components/FolderTagManager';
import { CodeShareForm } from '../components/CodeShareForm';
import { Modal } from '../components/Modal';
import { Folder, ChevronDown, ChevronUp } from 'lucide-react';

interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  language: string;
  code_content: string;
  created_at: string;
  tags: any[];
  folder: {
    id: string;
    name: string;
    parent: {
      id: string;
      name: string;
    } | null;
  };
  is_important: boolean;
  exam_notes: string | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const SUPPORTED_LANGUAGES = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'php', label: 'PHP' }
];

interface SelectedSnippet extends CodeSnippet {
  isExpanded?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(): TimeLeft {
  const examDate = new Date('March 24, 2025 00:00:00').getTime();
  const now = new Date().getTime();
  const difference = examDate - now;

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60)
  };
}

export default function Home() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [snippets, setSnippets] = React.useState<CodeSnippet[]>([]);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [availableTags, setAvailableTags] = React.useState<Tag[]>([]);
  const [selectedSnippet, setSelectedSnippet] = React.useState<SelectedSnippet | null>(null);
  const [isFullView, setIsFullView] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [showExamNotes, setShowExamNotes] = useState(false);
  const [examNotes, setExamNotes] = useState('');

  // Load initial data
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      loadInitialData();
    }
  }, [user, authLoading]);

  // Load snippets when filters change
  React.useEffect(() => {
    if (user) {
      loadSnippets();
    }
  }, [selectedFolder, selectedTag]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
    await Promise.all([loadSnippets(), loadTags()]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  }

  const loadTags = async () => {
    try {
      const { data: tags, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableTags(tags || []);
    } catch (error: any) {
      console.error('Error loading tags:', error);
    }
  };

  async function loadSnippets() {
    try {
      setIsTransitioning(true);
      setError(null);

      await new Promise(resolve => setTimeout(resolve, 150));

      let query = supabase
        .from('code_snippets')
        .select(`
          *,
          tags:code_snippets_tags(tags(*)),
          folder:folder_id (
            id,
            name,
            parent:parent_id (
              id,
              name
            )
          )
        `);

      if (selectedFolder) {
        query = query.eq('folder_id', selectedFolder);
      }

      if (selectedTag) {
        const languageTag = SUPPORTED_LANGUAGES.find(
          lang => lang.label.toLowerCase() === selectedTag.toLowerCase()
        );
        if (languageTag) {
          query = query.eq('language', languageTag.value);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const snippetsWithTags = data?.map(snippet => ({
        ...snippet,
        tags: snippet.tags
          .map((t: any) => t.tags)
          .filter((tag: any) => tag !== null)
      })) || [];

      const filteredSnippets = selectedTag
        ? SUPPORTED_LANGUAGES.find(
            lang => lang.label.toLowerCase() === selectedTag.toLowerCase()
          )
          ? snippetsWithTags
          : snippetsWithTags.filter(snippet =>
            snippet.tags.some((tag: any) => 
              tag.name.toLowerCase() === selectedTag.toLowerCase()
            )
          )
        : snippetsWithTags;

      setSnippets(filteredSnippets);
    } catch (error: any) {
      console.error('Error loading code snippets:', error);
      setError(error.message || 'Failed to load code snippets. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setIsTransitioning(false), 100);
    }
  }

  async function handleCopyCode(snippet: CodeSnippet) {
    try {
      await navigator.clipboard.writeText(snippet.code_content);
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }

  function handleDownload(snippet: CodeSnippet) {
    const extension = snippet.language === 'python' ? '.py' : `.${snippet.language}`;
    const blob = new Blob([snippet.code_content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${snippet.title}${extension}`);
  }

  const handleSnippetClick = (snippet: CodeSnippet) => {
    setSelectedSnippet(snippet);
    setIsFullView(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Code Library
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse and share code snippets with your classmates
            </p>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
              <span className="animate-pulse">🎓</span>
              <span>Time Until 1<sup>st</sup> Semester Exam</span>
              <span className="animate-pulse">🎓</span>
              
            </h2>
            <div className="grid grid-cols-4 gap-4 max-w-xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 transform hover:scale-105 transition-all duration-300 shadow-xl border border-white/30">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-200 to-white bg-clip-text text-transparent">
                  {timeLeft.days}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1 font-medium">Days</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 transform hover:scale-105 transition-all duration-300 shadow-xl border border-white/30">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-200 to-white bg-clip-text text-transparent">
                  {timeLeft.hours}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1 font-medium">Hours</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 transform hover:scale-105 transition-all duration-300 shadow-xl border border-white/30">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-200 to-white bg-clip-text text-transparent">
                  {timeLeft.minutes}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1 font-medium">Minutes</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 transform hover:scale-105 transition-all duration-300 shadow-xl border border-white/30">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-200 to-white bg-clip-text text-transparent">
                  {timeLeft.seconds}
                </div>
                <div className="text-xs uppercase tracking-wider mt-1 font-medium">Seconds</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/80 font-medium">
              Stay focused and keep coding!✨
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-red-600 text-center">{error}</div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar */}
              <div className="col-span-12 md:col-span-3">
                <FolderTagManager
                  onSelectFolder={setSelectedFolder}
                  onSelectTag={setSelectedTag}
                  selectedFolder={selectedFolder}
                  selectedTag={selectedTag}
                  isAdmin={isAdmin}
                />
              </div>

              {/* Main Content */}
              <div className="col-span-12 md:col-span-9 h-[calc(100vh-8rem)]">
                <div className="bg-white shadow rounded-lg h-full flex flex-col">
                  <div className="p-6 border-b">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                      <div className="flex flex-col w-full sm:w-auto mb-4 sm:mb-0">
                        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                      Code Snippets
                        </h1>
                      {selectedTag && (
                          <div className="mt-2">
                            <span className="text-sm text-gray-500">filtered by </span>
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium"
                              style={{
                                backgroundColor: availableTags.find(tag => tag.name === selectedTag)?.color || '#E5E7EB',
                                color: availableTags.find(tag => tag.name === selectedTag)?.color ? '#FFFFFF' : '#374151'
                              }}
                            >
                              {selectedTag}
                        </span>
                          </div>
                      )}
                      </div>
                    {isAdmin && (
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Share Code
                      </button>
                    )}
                    </div>
                  </div>

                  {/* Code Share Modal */}
                  <Modal
                    isOpen={showCreateForm}
                    onClose={() => setShowCreateForm(false)}
                    title="Share Code"
                  >
                    <CodeShareForm onSuccess={() => {
                      loadSnippets();
                      setShowCreateForm(false);
                    }} />
                  </Modal>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="relative">
                      <div 
                        className={`grid grid-cols-1 sm:grid-cols-2 gap-6 transition-opacity duration-300 ${
                          isTransitioning ? 'opacity-0' : 'opacity-100'
                        }`}
                      >
                    {snippets.map((snippet) => (
                          <div
                            key={snippet.id}
                            onClick={() => handleSnippetClick(snippet)}
                            className={`bg-white rounded-lg border ${
                              snippet.is_important 
                                ? 'border-amber-300 ring-2 ring-amber-200' 
                                : 'border-gray-200'
                            } p-6 hover:shadow-lg transition-shadow cursor-pointer group relative`}
                          >
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <p className="text-sm font-medium">Click to view full code</p>
                            </div>
                            
                            <div className="flex flex-col h-full">
                              <div className="mb-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-medium text-gray-900 truncate">
                                    {snippet.title}
                                  </h3>
                                  {snippet.is_important && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                      Important for Exam ⭐
                                    </span>
                                  )}
                                </div>
                                {snippet.description && (
                                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                                    {snippet.description}
                                  </p>
                                )}
                                {snippet.exam_notes && (
                                  <div className="mt-2 p-2 bg-amber-50 rounded-md">
                                    <p className="text-sm text-amber-800">
                                      <span className="font-medium">Exam Note:</span> {snippet.exam_notes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3 mb-4">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Folder className="h-4 w-4 mr-2" />
                                  <span className="truncate">
                                    {snippet.folder?.parent?.name && (
                                      <>
                                        <span>{snippet.folder.parent.name}</span>
                                        <span className="mx-1">→</span>
                                      </>
                                    )}
                                    {snippet.folder?.name}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {SUPPORTED_LANGUAGES.find(l => l.value === snippet.language)?.label}
                              </span>
                                </div>
                            </div>

                              <div className="relative h-48 overflow-hidden rounded bg-gray-50">
                                <SyntaxHighlighter
                                  language={snippet.language}
                                  style={vscDarkPlus}
                                  customStyle={{
                                    margin: 0,
                                    padding: '1rem',
                                    fontSize: '0.875rem',
                                    height: '100%',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {snippet.code_content}
                                </SyntaxHighlighter>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Loading overlay */}
                      {isTransitioning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full View Modal */}
                <Modal
                  isOpen={isFullView}
                  onClose={() => setIsFullView(false)}
                  title={selectedSnippet?.title || ''}
                >
                  {selectedSnippet && (
                    <div className="space-y-4">
                      {selectedSnippet.description && (
                        <p className="text-gray-600">{selectedSnippet.description}</p>
                      )}

                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <Folder className="h-4 w-4 mr-1" />
                          <span>
                            {selectedSnippet.folder?.parent?.name && (
                              <>
                                <span>{selectedSnippet.folder.parent.name}</span>
                                <span className="mx-1">→</span>
                              </>
                            )}
                            {selectedSnippet.folder?.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {SUPPORTED_LANGUAGES.find(l => l.value === selectedSnippet.language)?.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(selectedSnippet.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCopyCode(selectedSnippet)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                              {copiedId === selectedSnippet.id ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={() => handleDownload(selectedSnippet)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      </div>

                        <div className="mt-4 rounded-lg overflow-hidden">
                          <SyntaxHighlighter
                          language={selectedSnippet.language}
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem'
                            }}
                          >
                          {selectedSnippet.code_content}
                          </SyntaxHighlighter>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from('code_snippets')
                                .update({ is_important: !selectedSnippet.is_important })
                                .eq('id', selectedSnippet.id);
                              if (!error) {
                                setSelectedSnippet({
                                  ...selectedSnippet,
                                  is_important: !selectedSnippet.is_important
                                });
                                loadSnippets();
                              }
                            }}
                            className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                              selectedSnippet.is_important
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {selectedSnippet.is_important ? '⭐ Marked as Important' : 'Mark as Important'}
                          </button>
                          <button
                            onClick={() => setShowExamNotes(true)}
                            className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                          >
                            {selectedSnippet.exam_notes ? 'Edit Exam Notes' : 'Add Exam Notes'}
                          </button>
                        </div>
                      )}

                      {/* Exam Notes Modal */}
                      <Modal
                        isOpen={showExamNotes}
                        onClose={() => setShowExamNotes(false)}
                        title="Exam Notes"
                      >
                        <div className="space-y-4">
                          <textarea
                            value={examNotes}
                            onChange={(e) => setExamNotes(e.target.value)}
                            placeholder="Add important notes for exam..."
                            className="w-full h-32 p-2 border rounded-md"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setShowExamNotes(false)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                const { error } = await supabase
                                  .from('code_snippets')
                                  .update({ exam_notes: examNotes })
                                  .eq('id', selectedSnippet.id);
                                if (!error) {
                                  setSelectedSnippet({
                                    ...selectedSnippet,
                                    exam_notes: examNotes
                                  });
                                  setShowExamNotes(false);
                                  loadSnippets();
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            >
                              Save Notes
                            </button>
                          </div>
                        </div>
                      </Modal>
                    </div>
                  )}
                </Modal>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}