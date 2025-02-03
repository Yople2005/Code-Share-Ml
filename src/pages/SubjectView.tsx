import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FileText, Folder, Plus, Tag, Search, ArrowLeft, Upload, X, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Subject {
  id: string;
  name: string;
  parent_id: string | null;
  description: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  subject_id: string;
  content: string;
  created_at: string;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export function SubjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [subject, setSubject] = React.useState<Subject | null>(null);
  const [subfolders, setSubfolders] = React.useState<Folder[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [isCreatingNote, setIsCreatingNote] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [newNoteName, setNewNoteName] = React.useState('');
  const [newNoteContent, setNewNoteContent] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadSubjectData();
  }, [id]);

  async function loadSubjectData() {
    try {
      setLoading(true);
      setError(null);

      // Load current subject if we're in a subfolder
      if (id) {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', id)
          .single();

        if (subjectError) throw subjectError;
        setSubject(subjectData);
      }

      // Load subfolders
      const { data: subfoldersData, error: subfoldersError } = await supabase
        .from('subjects')
        .select('*')
        .eq('parent_id', id || null)
        .order('name');

      if (subfoldersError) throw subfoldersError;
      setSubfolders(subfoldersData || []);

      // Load notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*, attachments(*)')
        .eq('subject_id', id || null)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error: any) {
      console.error('Error loading subject data:', error);
      setError('Failed to load subject data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim() || !isAdmin) return;

    try {
      setIsCreatingFolder(true);
      setError(null);

      const { data, error } = await supabase
        .from('subjects')
        .insert([
          {
            name: newFolderName.trim(),
            parent_id: id || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setSubfolders([...subfolders, data]);
      setNewFolderName('');
    } catch (error: any) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder. Please try again.');
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNoteName.trim() || !isAdmin) return;

    try {
      setIsCreatingNote(true);
      setError(null);

      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            title: newNoteName.trim(),
            content: newNoteContent.trim(),
            subject_id: id || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (selectedFiles.length > 0) {
        await uploadFiles(data.id);
      }

      setNotes([data, ...notes]);
      setNewNoteName('');
      setNewNoteContent('');
      setSelectedFiles([]);
    } catch (error: any) {
      console.error('Error creating note:', error);
      setError('Failed to create note. Please try again.');
    } finally {
      setIsCreatingNote(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    // Limit total files to 5
    if (selectedFiles.length + files.length > 5) {
      setError('You can only upload up to 5 files per note');
      return;
    }
    // Limit each file to 10MB
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Each file must be less than 10MB');
      return;
    }
    setSelectedFiles(prev => [...prev, ...files]);
    setError('');
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadFiles(noteId: string): Promise<Attachment[]> {
    const attachments: Attachment[] = [];
    setUploadProgress(0);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${noteId}/${Date.now()}.${fileExt}`;

      try {
        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        // Create attachment record
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('attachments')
          .insert([
            {
              note_id: noteId,
              file_name: file.name,
              file_type: file.type,
              file_url: publicUrl,
              created_by: (await supabase.auth.getUser()).data.user?.id
            }
          ])
          .select()
          .single();

        if (attachmentError) throw attachmentError;
        attachments.push(attachmentData);

        // Update progress
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      } catch (error) {
        console.error('Error uploading file:', error);
        setError('Error uploading file: ' + file.name);
      }
    }

    return attachments;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading subject data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {subject ? subject.name : 'All Subjects'}
        </h1>
      </div>

      {/* Create forms - Only visible to admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Create folder form */}
          <form onSubmit={handleCreateFolder} className="card p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Folder</h3>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name..."
                className="flex-1"
              />
              <button
                type="submit"
                disabled={isCreatingFolder || !newFolderName.trim()}
                className="btn btn-primary"
              >
                {isCreatingFolder ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </form>

          {/* Create note form */}
          <form onSubmit={handleCreateNote} className="card p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Note</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newNoteName}
                onChange={(e) => setNewNoteName(e.target.value)}
                placeholder="New note title..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="New note content..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
              />
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Attachments</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload files</span>
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        multiple
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Images up to 10MB (max 5 files)
                  </p>
                </div>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <File className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div
                        style={{ width: `${uploadProgress}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="submit"
                disabled={isCreatingNote || !newNoteName.trim()}
                className="btn btn-primary"
              >
                {isCreatingNote ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="error-message mb-8">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="space-y-8">
        {/* Subfolders */}
        {subfolders.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Folders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subfolders.map((folder) => (
                <Link
                  key={folder.id}
                  to={`/subjects/${folder.id}`}
                  className="card p-6 text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center">
                        <Folder className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {folder.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Created {new Date(folder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="card p-6 text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {note.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Created {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {subfolders.length === 0 && notes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No items yet</h3>
            <p className="mt-1 text-gray-500">
              {isAdmin ? 'Create your first folder or note' : 'No content available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}