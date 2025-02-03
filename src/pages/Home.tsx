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
                            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group relative"
                          >
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <p className="text-sm font-medium">Click to view full code</p>
                            </div>
                            
                            <div className="flex flex-col h-full">
                              <div className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900 truncate">
                                  {snippet.title}
                                </h3>
                                {snippet.description && (
                                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                                    {snippet.description}
                                  </p>
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