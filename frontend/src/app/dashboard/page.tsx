'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { DashboardLayout } from '@/components/dashboard/layout';
import { DocumentEditor } from '@/components/document/DocumentEditor';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { JSONContent } from '@tiptap/react';
import { v4 as uuidv4 } from 'uuid';

export default function DashboardPage() {
  const router = useRouter();
  const { user, fetchUserDetails, logout } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<{
    id: string;
    title: string;
    content: JSONContent;
  }[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setIsClient(true);
    
    const checkUserAuthentication = async () => {
      try {
        if (!user) {
          const fetchedUser = await fetchUserDetails();
          
          if (!fetchedUser) {
            console.warn('No user found, redirecting to login');
            router.push('/auth/login');
            return;
          }
        }

        // Create an initial document if no documents exist
        if (documents.length === 0) {
          const newDocumentId = uuidv4();
          setDocuments([{
            id: newDocumentId,
            title: 'Untitled Document',
            content: {}
          }]);
          setActiveDocumentId(newDocumentId);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        logout(); // Clear any stale auth state
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAuthentication();
  }, [user, fetchUserDetails, router, logout]);

  const handleDocumentChange = (documentId: string) => {
    setActiveDocumentId(documentId);
  };

  const handleDocumentClose = (documentId: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    setDocuments(updatedDocuments);
    
    // If closing the active document, select another or create a new one
    if (documentId === activeDocumentId) {
      if (updatedDocuments.length > 0) {
        setActiveDocumentId(updatedDocuments[0].id);
      } else {
        const newDocumentId = uuidv4();
        setDocuments([{
          id: newDocumentId,
          title: 'Untitled Document',
          content: {}
        }]);
        setActiveDocumentId(newDocumentId);
      }
    }
  };

  const handleDocumentSave = async (documentId: string, content: JSONContent) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => 
        doc.id === documentId 
          ? { ...doc, content } 
          : doc
      )
    );
    // TODO: Implement actual save logic to backend
  };

  if (!isClient || isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Redirect handled in useEffect
  }

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="w-2/3 p-4">
          <DocumentEditor 
            initialContent={documents.find(doc => doc.id === activeDocumentId)?.content}
            onUpdate={(content: JSONContent) => {
              setDocuments(prevDocs => 
                prevDocs.map(doc => 
                  doc.id === activeDocumentId 
                    ? { ...doc, content } 
                    : doc
                )
              );
            }}
          />
        </div>
        <div className="w-1/3 p-4 border-l">
          <DocumentViewer 
            documents={documents}
            activeDocumentId={activeDocumentId}
            onDocumentChange={handleDocumentChange}
            onDocumentClose={handleDocumentClose}
            onDocumentSave={handleDocumentSave}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
