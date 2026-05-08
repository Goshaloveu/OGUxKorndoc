/**
 * BackgroundTaskMonitor — global polling component, never unmounts.
 *
 * Mounted inside NotificationProvider, above Layout, so it survives navigation.
 * UploadPage only registers tasks via registerPendingUpload() — all polling is here.
 *
 * Polling interval: 6 seconds per task.
 * Task timeout: 15 minutes (applied on load in NotificationContext).
 */

import React, { useEffect, useRef } from 'react';
import { getDocumentStatus } from '../api/documents';
import { useNotifications } from '../contexts/NotificationContext';

const POLL_INTERVAL_MS = 6_000;

const BackgroundTaskMonitor: React.FC = () => {
  const { pendingTasks, addNotification, resolvePendingTask, updateTaskStatus } =
    useNotifications();

  // Keep ref so interval callback always sees latest tasks without re-scheduling
  const tasksRef = useRef(pendingTasks);
  tasksRef.current = pendingTasks;

  useEffect(() => {
    const id = setInterval(async () => {
      const tasks = tasksRef.current;
      if (tasks.length === 0) return;

      const results = await Promise.allSettled(
        tasks.map(async (task) => {
          const data = await getDocumentStatus(task.docId);
          return { task, status: data.status, errorMsg: data.error_message };
        }),
      );

      let resolvedCount = 0;
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { task, status, errorMsg } = result.value;

        if (status === task.lastKnownStatus) continue;

        if (status === 'indexed') {
          addNotification(
            'success',
            'upload',
            `Файл «${task.filename}» успешно проиндексирован`,
          );
          resolvePendingTask(task.docId);
          resolvedCount++;
        } else if (status === 'error') {
          addNotification(
            'error',
            'upload',
            `Ошибка обработки файла «${task.filename}»`,
            errorMsg ?? undefined,
          );
          resolvePendingTask(task.docId);
          resolvedCount++;
        } else {
          updateTaskStatus(task.docId, status);
        }
      }

      // "All files done" notification when multiple tasks resolved together
      if (resolvedCount > 1 && resolvedCount === tasks.length) {
        addNotification('success', 'upload', 'Все файлы успешно обработаны');
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty: tasksRef keeps callback fresh without re-registering interval

  return null;
};

export default BackgroundTaskMonitor;
