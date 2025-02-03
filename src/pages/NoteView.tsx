import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, File, FileText, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

interface Note {
  id: string;
  title: string;
  content: string;
  folder: string | null;
  created_at: string;
  created_by: string;
  attachments: Attachment[];
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
}

export function NoteView() {
  const { id } = useParams();
  const [note, setNote] = React.useState<Note | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newComment, setNewComment] = React.useState('');
  const user = supabase.auth.getUser();
  const { isAdmin } = useAuth();

  React.useEffect(() => {
    fetchNoteData();
  }, [id]);

  async function fetchNoteData() {
    try {
      // Fetch note details
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select(`
          *,
          attachments (
            id,
            file_name,
            file_type,
            file_url
          )
        `)
        .eq('id', id)
        .single();

      if (noteError) throw noteError;
      setNote(noteData);

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('note_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      setComments(commentsData || []);
    } catch (error) {
      console.error('Error fetching note data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFileIcon(fileType: string) {
    if (fileType.includes('image')) {
      return 'image';
    } else if (fileType.includes('pdf')) {
      return 'pdf';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return 'doc';
    } else {
      return 'file';
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            note_id: id,
            content: newComment.trim(),
            created_by: user.id
          }
        ]);

      if (error) throw error;
      setNewComment('');
      fetchNoteData();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!note) {
    return <div className="text-center text-gray-600">Note not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to={`/subject/${note.id}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Subject
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
          <div className="mt-2 flex items-center text-gray-500">
            <Folder className="h-4 w-4 mr-2" />
            <span>{note.folder}</span>
            <span className="mx-2">•</span>
            <span>{new Date(note.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="prose max-w-none mb-8">
          <ReactMarkdown>{note.content}</ReactMarkdown>
        </div>

        {note.attachments && note.attachments.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Attachments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {note.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {attachment.file_type.includes('image') ? (
                      <img
                        src={attachment.file_url}
                        alt={attachment.file_name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <File className="h-10 w-10 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{attachment.file_name}</p>
                      <p className="text-sm text-gray-500">
                        {attachment.file_type.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={attachment.file_url}
                    download
                    className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="p-6 border-t">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
          
          {user && (
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Comment
              </button>
            </form>
          )}

          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">User</span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}