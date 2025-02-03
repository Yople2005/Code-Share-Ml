import React from 'react';
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

interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  language: string;
  code_content: string;
  created_at: string;
  tags: any[];
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

  async function loadInitialData() {
    await Promise.all([loadSnippets(), loadTags()]);
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
      setLoading(true);
      setError(null);

      let query = supabase
        .from('code_snippets')
        .select('*, tags:code_snippets_tags(tags(*))');

      if (selectedFolder) {
        query = query.eq('folder_id', selectedFolder);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process tags and filter by selected tag if any
      const snippetsWithTags = data?.map(snippet => ({
        ...snippet,
        tags: snippet.tags
          .map((t: any) => t.tags)
          .filter((tag: any) => tag !== null)
      })) || [];

      // Filter by selected tag if one is selected
      const filteredSnippets = selectedTag
        ? snippetsWithTags.filter(snippet =>
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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">You can get your codes here</h1>
        </div>
      </header>

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
              <div className="col-span-12 md:col-span-9">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                      Code Snippets
                      {selectedTag && (
                        <span className="ml-2 text-sm text-gray-500">
                          filtered by {selectedTag}
                        </span>
                      )}
                    </h1>
                    {isAdmin && (
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Share Code
                      </button>
                    )}
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

                  <div className="space-y-6">
                    {snippets.map((snippet) => (
                      <div key={snippet.id} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {snippet.title}
                            </h3>
                            {snippet.description && (
                              <p className="mt-1 text-sm text-gray-500">
                                {snippet.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center space-x-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {SUPPORTED_LANGUAGES.find(l => l.value === snippet.language)?.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(snippet.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {snippet.tags?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {snippet.tags.map((tag: any) => (
                                  <span
                                    key={tag.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                      backgroundColor: `${tag.color}15`,
                                      color: tag.color
                                    }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCopyCode(snippet)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              {copiedId === snippet.id ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                  Copy
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDownload(snippet)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg overflow-hidden">
                          <SyntaxHighlighter
                            language={snippet.language}
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            {snippet.code_content}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    ))}

                    {snippets.length === 0 && !error && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No code snippets yet</h3>
                        <p className="mt-1 text-gray-500">
                          {isAdmin ? 'Share your first code snippet' : 'No code snippets available'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}