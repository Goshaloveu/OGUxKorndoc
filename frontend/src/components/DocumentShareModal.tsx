import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  Label,
  NumberInput,
  Select,
  Skeleton,
  Text,
} from '@gravity-ui/uikit';
import { TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDocumentPermission,
  getDocumentPermissions,
  removeDocumentPermission,
} from '../api/documents';
import type { DocumentPermission } from '../types';

const LEVEL_OPTIONS = [
  { value: 'viewer', content: 'Читатель (viewer)' },
  { value: 'editor', content: 'Редактор (editor)' },
  { value: 'owner', content: 'Владелец (owner)' },
];

const LEVEL_THEME: Record<DocumentPermission['level'], 'info' | 'warning' | 'danger'> = {
  viewer: 'info',
  editor: 'warning',
  owner: 'danger',
};

interface DocumentShareModalProps {
  docId: number | null;
  docTitle: string;
  onClose: () => void;
}

const DocumentShareModal: React.FC<DocumentShareModalProps> = ({ docId, docTitle, onClose }) => {
  const queryClient = useQueryClient();
  const [newUserId, setNewUserId] = useState<number | null>(null);
  const [newOrgId, setNewOrgId] = useState<number | null>(null);
  const [newLevel, setNewLevel] = useState<string[]>(['viewer']);
  const [addTarget, setAddTarget] = useState<'user' | 'org'>('user');

  const { data: permissions, isLoading, isError } = useQuery({
    queryKey: ['doc-permissions', docId],
    queryFn: () => getDocumentPermissions(docId!),
    enabled: !!docId,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addDocumentPermission(docId!, {
        ...(addTarget === 'user' ? { user_id: newUserId ?? undefined } : { org_id: newOrgId ?? undefined }),
        level: newLevel[0] as DocumentPermission['level'],
      }),
    onSuccess: () => {
      toaster.add({ name: 'perm-added', title: 'Доступ выдан', theme: 'success', autoHiding: 3000 });
      setNewUserId(null);
      setNewOrgId(null);
      void queryClient.invalidateQueries({ queryKey: ['doc-permissions', docId] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'perm-err',
        title: err.response?.data?.detail ?? 'Ошибка при выдаче доступа',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (permId: number) => removeDocumentPermission(docId!, permId),
    onSuccess: () => {
      toaster.add({ name: 'perm-removed', title: 'Доступ отозван', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['doc-permissions', docId] });
    },
    onError: () => {
      toaster.add({ name: 'perm-rm-err', title: 'Ошибка при отзыве доступа', theme: 'danger', autoHiding: 4000 });
    },
  });

  const canAdd =
    addTarget === 'user' ? newUserId !== null && newUserId > 0 : newOrgId !== null && newOrgId > 0;

  return (
    <Dialog open={!!docId} onClose={onClose} size="m">
      <Dialog.Header caption={`Доступ к: ${docTitle}`} />
      <Dialog.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 460 }}>
          {/* Existing permissions */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 36 }} />)}
            </div>
          )}
          {isError && (
            <Alert theme="danger" message="Не удалось загрузить список прав" />
          )}
          {permissions && permissions.length === 0 && (
            <Text color="secondary">Прав не выдано (только загрузивший имеет доступ)</Text>
          )}
          {permissions && permissions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {permissions.map((perm) => (
                <div
                  key={perm.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: 'var(--g-color-base-simple-hover-solid)',
                    borderRadius: 8,
                  }}
                >
                  <Text variant="body-2" style={{ flex: 1 }}>
                    {perm.user_id !== null ? `👤 Пользователь #${perm.user_id}` : `🏢 Организация #${perm.org_id}`}
                  </Text>
                  <Label theme={LEVEL_THEME[perm.level]} size="s">{perm.level}</Label>
                  <Button
                    view="flat-danger"
                    size="s"
                    loading={removeMutation.isPending && removeMutation.variables === perm.id}
                    onClick={() => removeMutation.mutate(perm.id)}
                    title="Отозвать доступ"
                  >
                    <Icon data={TrashBin} size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new permission */}
          <div
            style={{
              borderTop: '1px solid var(--g-color-line-generic)',
              paddingTop: '1rem',
            }}
          >
            <Text variant="subheader-2" style={{ marginBottom: 8, display: 'block' }}>
              Добавить доступ
            </Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Select
                value={[addTarget]}
                onUpdate={(v) => setAddTarget(v[0] as 'user' | 'org')}
                options={[
                  { value: 'user', content: 'Пользователь' },
                  { value: 'org', content: 'Организация' },
                ]}
                size="m"
                width="auto"
              />
              {addTarget === 'user' ? (
                <NumberInput
                  value={newUserId ?? undefined}
                  onUpdate={(v) => setNewUserId(v ?? null)}
                  placeholder="ID пользователя"
                  min={1}
                  hiddenControls
                  size="m"
                />
              ) : (
                <NumberInput
                  value={newOrgId ?? undefined}
                  onUpdate={(v) => setNewOrgId(v ?? null)}
                  placeholder="ID организации"
                  min={1}
                  hiddenControls
                  size="m"
                />
              )}
              <Select
                value={newLevel}
                onUpdate={setNewLevel}
                options={LEVEL_OPTIONS}
                size="m"
                width="auto"
              />
              <Button
                view="action"
                size="m"
                disabled={!canAdd}
                loading={addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                + Дать доступ
              </Button>
            </div>
          </div>
        </div>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={onClose}
        textButtonCancel="Закрыть"
      />
    </Dialog>
  );
};

export default DocumentShareModal;
