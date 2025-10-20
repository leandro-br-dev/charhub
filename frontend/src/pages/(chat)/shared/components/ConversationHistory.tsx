import { useState, useMemo } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Avatar, Modal } from '../../../../components/ui';
import { useToast } from '../../../../contexts/ToastContext';
import { useConversationListQuery, useConversationMutations } from '../hooks/useConversations';
import type { Conversation } from '../../../../types/chat';

export interface ConversationHistoryProps {
  onLinkClick?: () => void;
}

type GroupBy = 'date' | 'alphabetical';

export const ConversationHistory = ({ onLinkClick }: ConversationHistoryProps) => {
  const { t, i18n } = useTranslation('chat');
  const { conversationId: activeConversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);

  // Queries and mutations
  const { data: conversationsData, isLoading } = useConversationListQuery();
  const { updateTitle, delete: deleteConversation } = useConversationMutations();
  const { addToast } = useToast();

  const conversations: Conversation[] = conversationsData?.items ?? [];

  /**
   * Get time reference for grouping conversations by date
   */
  const getTimeReference = (dateString: string): string => {
    if (!dateString) return t('history.invalidDate', { defaultValue: 'Invalid Date' });

    const now = new Date();
    const conversationDate = new Date(dateString);

    if (isNaN(conversationDate.getTime())) {
      return t('history.invalidDate', { defaultValue: 'Invalid Date' });
    }

    const diffTime = now.getTime() - conversationDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0 && now.getDate() === conversationDate.getDate()) {
      return t('history.today', { defaultValue: 'Today' });
    }
    if (diffDays === 0 || (diffDays === 1 && now.getHours() < conversationDate.getHours())) {
      return t('history.yesterday', { defaultValue: 'Yesterday' });
    }
    if (diffDays <= 7) {
      return t('history.last7Days', { defaultValue: 'Last 7 days' });
    }
    if (diffDays <= 30) {
      return t('history.last30Days', { defaultValue: 'Last 30 days' });
    }

    const month = conversationDate.toLocaleString(i18n.language, { month: 'long' });
    const year = conversationDate.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  };

  /**
   * Filter and group conversations
   */
  const groupedConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = conversations.filter((conv: Conversation) =>
        conv.title?.toLowerCase().includes(lowerQuery)
      );
    }

    // Group conversations
    const grouped: Record<string, Conversation[]> = {};

    if (groupBy === 'date') {
      filtered.forEach((conv: Conversation) => {
        const timeRef = getTimeReference(conv.lastMessageAt || conv.createdAt);
        if (!grouped[timeRef]) grouped[timeRef] = [];
        grouped[timeRef].push(conv);
      });

      // Sort within each group by date (newest first)
      Object.keys(grouped).forEach((key) => {
        grouped[key].sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.createdAt).getTime() -
            new Date(a.lastMessageAt || a.createdAt).getTime()
        );
      });

      // Sort groups by predefined order
      const timeOrder = [
        t('history.today', { defaultValue: 'Today' }),
        t('history.yesterday', { defaultValue: 'Yesterday' }),
        t('history.last7Days', { defaultValue: 'Last 7 days' }),
        t('history.last30Days', { defaultValue: 'Last 30 days' }),
      ];

      return Object.entries(grouped).sort((a, b) => {
        const [groupNameA] = a;
        const [groupNameB] = b;
        const indexA = timeOrder.indexOf(groupNameA);
        const indexB = timeOrder.indexOf(groupNameB);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        // For month/year groups, sort by date
        return groupNameB.localeCompare(groupNameA, i18n.language);
      });
    } else {
      // Group by first letter
      filtered.forEach((conv: Conversation) => {
        const firstLetter = conv.title?.[0]?.toUpperCase() || '#';
        if (!grouped[firstLetter]) grouped[firstLetter] = [];
        grouped[firstLetter].push(conv);
      });

      // Sort within each group
      Object.keys(grouped).forEach((key) => {
        grouped[key].sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.createdAt).getTime() -
            new Date(a.lastMessageAt || a.createdAt).getTime()
        );
      });

      return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0], i18n.language));
    }
  }, [conversations, searchQuery, groupBy, getTimeReference, i18n.language, t]);

  /**
   * Handle edit conversation title
   */
  const handleEditClick = (conv: Conversation) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || '');
  };

  const handleCancelEdit = () => {
    setEditingConvId(null);
    setEditingTitle('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConvId || !editingTitle.trim()) return;

    try {
      await updateTitle.mutateAsync({
        conversationId: editingConvId,
        title: editingTitle.trim(),
      });
      handleCancelEdit();
    } catch (error) {
      console.error('[ConversationHistory] Error updating title:', error);
    }
  };

  /**
   * Handle delete conversation
   */
  const handleDeleteClick = (convId: string) => {
    setDeletingConvId(convId);
  };

  const handleConfirmDelete = async () => {
    if (!deletingConvId) return;

    try {
      await deleteConversation.mutateAsync(deletingConvId);

      addToast(
        t('history.deleteSuccess', { defaultValue: 'Conversation deleted successfully' }),
        'success'
      );

      // Navigate away if deleting active conversation
      if (activeConversationId === deletingConvId) {
        navigate('/chat', { replace: true });
      }
    } catch (error) {
      console.error('[ConversationHistory] Error deleting conversation:', error);
      addToast(
        t('errors.deleteFailed', { defaultValue: 'Failed to delete conversation' }),
        'error'
      );
    } finally {
      setDeletingConvId(null);
    }
  };

  const deletingConversation = conversations.find((c: Conversation) => c.id === deletingConvId);

  return (
    <div className="py-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 mb-4 px-4">
        <h3 className="text-xs font-semibold text-muted uppercase mb-3">
          {t('history.title', { defaultValue: 'Conversation History' })}
        </h3>

        {/* Search */}
        <input
          type="text"
          placeholder={t('history.searchPlaceholder', { defaultValue: 'Search conversations...' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 mb-2 bg-background border border-normal rounded-lg text-sm text-content placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />

        {/* Group By Toggle */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">{t('history.groupBy', { defaultValue: 'Group by:' })}</span>
          <Button
            variant={groupBy === 'date' ? 'primary' : 'light'}
            size="small"
            onClick={() => setGroupBy('date')}
          >
            {t('history.groupByDate', { defaultValue: 'Date' })}
          </Button>
          <Button
            variant={groupBy === 'alphabetical' ? 'primary' : 'light'}
            size="small"
            onClick={() => setGroupBy('alphabetical')}
          >
            {t('history.groupByName', { defaultValue: 'Name' })}
          </Button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-grow overflow-y-auto pr-1">
        {isLoading && (
          <p className="text-muted text-sm text-center mt-4">
            {t('common.loading', { defaultValue: 'Loading...' })}
          </p>
        )}

        {!isLoading && groupedConversations.length === 0 && (
          <p className="text-muted text-sm text-center mt-4">
            {searchQuery
              ? t('history.noResults', { defaultValue: 'No conversations found' })
              : t('history.empty', { defaultValue: 'No conversations yet' })}
          </p>
        )}

        {!isLoading && groupedConversations.length > 0 && (
          <div className="space-y-4">
            {groupedConversations.map(([group, items]) => (
              <div key={group}>
                <h4 className="text-xs font-semibold text-muted uppercase mb-1">{group}</h4>
                <ul className="space-y-1">
                  {items.map((conv) => (
                    <li key={conv.id} className="group relative">
                      {editingConvId === conv.id ? (
                        <form
                          onSubmit={handleSaveEdit}
                          className="p-2 bg-primary/10 rounded flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-grow text-sm py-1 px-2 bg-background border border-primary rounded focus:outline-none"
                            autoFocus
                            disabled={updateTitle.isPending}
                          />
                          <Button
                            type="submit"
                            variant="primary"
                            size="small"
                            icon="check"
                            disabled={updateTitle.isPending}
                            title={t('common.save', { defaultValue: 'Save' })}
                          />
                          <Button
                            type="button"
                            variant="light"
                            size="small"
                            icon="close"
                            onClick={handleCancelEdit}
                            disabled={updateTitle.isPending}
                            title={t('common.cancel', { defaultValue: 'Cancel' })}
                          />
                        </form>
                      ) : (
                        <div className="flex items-center">
                          {/* Character Avatars */}
                          <div className="flex flex-shrink-0 items-center -space-x-2 mr-2">
                            {conv.participants
                              .filter((p) => p.actingCharacterId && p.actingCharacter)
                              .slice(0, 3)
                              .map((p) => (
                                <Avatar
                                  key={p.id}
                                  src={p.actingCharacter!.avatar}
                                  alt={
                                    p.actingCharacter!.lastName
                                      ? `${p.actingCharacter!.firstName} ${p.actingCharacter!.lastName}`
                                      : p.actingCharacter!.firstName
                                  }
                                  size="mini"
                                  className="border-2 border-light"
                                />
                              ))}
                            {conv.participants.filter((p) => p.actingCharacterId).length > 3 && (
                              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-light">
                                +{conv.participants.filter((p) => p.actingCharacterId).length - 3}
                              </div>
                            )}
                          </div>

                          {/* Conversation Link */}
                          <NavLink
                            to={`/chat/${conv.id}`}
                            onClick={onLinkClick}
                            className={({ isActive }) =>
                              `flex-grow block p-2 rounded text-sm truncate pr-16 text-content hover:bg-normal transition-colors ${
                                isActive ? 'bg-primary/20 font-semibold' : ''
                              }`
                            }
                            title={conv.title || t('history.untitled', { defaultValue: 'Untitled conversation' })}
                          >
                            {conv.title ||
                              t('history.untitled', { defaultValue: 'Untitled conversation' })}
                          </NavLink>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {editingConvId !== conv.id && (
                        <div className="absolute top-1/2 right-1 transform -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Button
                            variant="light"
                            size="small"
                            icon="edit"
                            onClick={() => handleEditClick(conv)}
                            title={t('history.editTitle', { defaultValue: 'Edit title' })}
                            className="p-1"
                          />
                          <Button
                            variant="light"
                            size="small"
                            icon="delete"
                            onClick={() => handleDeleteClick(conv.id)}
                            title={t('history.deleteConversation', { defaultValue: 'Delete conversation' })}
                            className="p-1 text-danger hover:bg-danger/10"
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 pt-4 px-4">
        <Button
          variant="primary"
          size="large"
          icon="add"
          onClick={() => {
            onLinkClick?.();
            navigate('/chat');
          }}
          className="w-full"
        >
          {t('history.newChat', { defaultValue: 'New Chat' })}
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingConvId}
        onClose={() => setDeletingConvId(null)}
        title={t('history.deleteConfirmTitle', { defaultValue: 'Delete Conversation' })}
      >
        <div className="space-y-4">
          <p className="text-sm text-content">
            {t('history.deleteConfirmMessage', {
              defaultValue: 'Are you sure you want to delete "{{title}}"? This action cannot be undone.',
              title: deletingConversation?.title || t('history.thisConversation', { defaultValue: 'this conversation' }),
            })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="light" onClick={() => setDeletingConvId(null)} disabled={deleteConversation.isPending}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button variant="primary" onClick={handleConfirmDelete} disabled={deleteConversation.isPending}>
              {deleteConversation.isPending
                ? t('common.deleting', { defaultValue: 'Deleting...' })
                : t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
