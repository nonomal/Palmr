"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  addFiles,
  addRecipients,
  createShareAlias,
  deleteShare,
  notifyRecipients,
  updateShare,
  updateSharePassword,
} from "@/http/endpoints";
import { ListUserShares200SharesItem } from "@/http/models/listUserShares200SharesItem";

export interface ShareManagerHook {
  shareToDelete: ListUserShares200SharesItem | null;
  shareToEdit: ListUserShares200SharesItem | null;
  shareToManageFiles: ListUserShares200SharesItem | null;
  shareToManageRecipients: ListUserShares200SharesItem | null;
  shareToManageSecurity: ListUserShares200SharesItem | null;
  shareToManageExpiration: ListUserShares200SharesItem | null;
  shareToViewDetails: ListUserShares200SharesItem | null;
  shareToGenerateLink: ListUserShares200SharesItem | null;
  sharesToDelete: ListUserShares200SharesItem[] | null;
  setShareToDelete: (share: ListUserShares200SharesItem | null) => void;
  setShareToEdit: (share: ListUserShares200SharesItem | null) => void;
  setShareToManageFiles: (share: ListUserShares200SharesItem | null) => void;
  setShareToManageRecipients: (share: ListUserShares200SharesItem | null) => void;
  setShareToManageSecurity: (share: ListUserShares200SharesItem | null) => void;
  setShareToManageExpiration: (share: ListUserShares200SharesItem | null) => void;
  setShareToViewDetails: (share: ListUserShares200SharesItem | null) => void;
  setShareToGenerateLink: (share: ListUserShares200SharesItem | null) => void;
  setSharesToDelete: (shares: ListUserShares200SharesItem[] | null) => void;
  handleDelete: (shareId: string) => Promise<void>;
  handleBulkDelete: (shares: ListUserShares200SharesItem[]) => void;
  handleDeleteBulk: () => Promise<void>;
  handleEdit: (shareId: string, data: any) => Promise<void>;
  handleUpdateName: (shareId: string, newName: string) => Promise<void>;
  handleUpdateDescription: (shareId: string, newDescription: string) => Promise<void>;
  handleUpdateSecurity: (shareId: string) => Promise<void>;
  handleUpdateExpiration: (shareId: string) => Promise<void>;
  handleManageFiles: (shareId: string, files: any[]) => Promise<void>;
  handleManageRecipients: (shareId: string, recipients: any[]) => Promise<void>;
  handleGenerateLink: (shareId: string, alias: string) => Promise<void>;
  handleNotifyRecipients: (share: ListUserShares200SharesItem) => Promise<void>;
  setClearSelectionCallback?: (callback: () => void) => void;
}

export function useShareManager(onSuccess: () => void) {
  const t = useTranslations();
  const [shareToDelete, setShareToDelete] = useState<ListUserShares200SharesItem | null>(null);
  const [shareToEdit, setShareToEdit] = useState<ListUserShares200SharesItem | null>(null);
  const [shareToManageFiles, setShareToManageFiles] = useState<ListUserShares200SharesItem | null>(null);
  const [shareToManageRecipients, setShareToManageRecipients] = useState<ListUserShares200SharesItem | null>(null);
  const [shareToManageSecurity, setShareToManageSecurity] = useState<ListUserShares200SharesItem | null>(null);
  const [shareToManageExpiration, setShareToManageExpiration] = useState<ListUserShares200SharesItem | null>(null);
  const [shareToViewDetails, setShareToViewDetails] = useState<ListUserShares200SharesItem | null>(null);
  const [shareToGenerateLink, setShareToGenerateLink] = useState<ListUserShares200SharesItem | null>(null);
  const [sharesToDelete, setSharesToDelete] = useState<ListUserShares200SharesItem[] | null>(null);
  const [clearSelectionCallback, setClearSelectionCallbackState] = useState<(() => void) | null>(null);

  const setClearSelectionCallback = useCallback((callback: () => void) => {
    setClearSelectionCallbackState(() => callback);
  }, []);

  const handleDelete = async (shareId: string) => {
    try {
      await deleteShare(shareId);
      toast.success(t("shareManager.deleteSuccess"));
      onSuccess();
      setShareToDelete(null);
    } catch (error) {
      toast.error(t("shareManager.deleteError"));
    }
  };

  const handleBulkDelete = (shares: ListUserShares200SharesItem[]) => {
    setSharesToDelete(shares);
  };

  const handleDeleteBulk = async () => {
    if (!sharesToDelete) return;

    const loadingToast = toast.loading(t("shareManager.bulkDeleteLoading", { count: sharesToDelete.length }));

    try {
      await Promise.all(sharesToDelete.map((share) => deleteShare(share.id)));
      toast.dismiss(loadingToast);
      toast.success(t("shareManager.bulkDeleteSuccess", { count: sharesToDelete.length }));
      setSharesToDelete(null);
      onSuccess();

      if (clearSelectionCallback) {
        clearSelectionCallback();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t("shareManager.bulkDeleteError"));
    }
  };

  const handleEdit = async (shareId: string, data: any) => {
    try {
      await updateShare({ id: shareId, ...data });
      toast.success(t("shareManager.updateSuccess"));
      onSuccess();
      setShareToEdit(null);
    } catch (error) {
      toast.error(t("shareManager.updateError"));
    }
  };

  const handleUpdateName = async (shareId: string, newName: string) => {
    try {
      await updateShare({ id: shareId, name: newName });
      await onSuccess();
      toast.success(t("shareManager.updateSuccess"));
    } catch (error) {
      toast.error(t("shareManager.updateError"));
    }
  };

  const handleUpdateDescription = async (shareId: string, newDescription: string) => {
    try {
      await updateShare({ id: shareId, description: newDescription });
      await onSuccess();
      toast.success(t("shareManager.updateSuccess"));
    } catch (error) {
      toast.error(t("shareManager.updateError"));
    }
  };

  const handleUpdateSecurity = async (shareId: string) => {
    try {
      await onSuccess();
      toast.success(t("shareManager.securityUpdateSuccess"));
    } catch (error) {
      toast.error(t("shareManager.securityUpdateError"));
    }
  };

  const handleUpdateExpiration = async (shareId: string) => {
    try {
      await onSuccess();
      toast.success(t("shareManager.expirationUpdateSuccess"));
    } catch (error) {
      toast.error(t("shareManager.expirationUpdateError"));
    }
  };

  const handleManageFiles = async (shareId: string, files: string[]) => {
    try {
      await addFiles(shareId, { files });
      toast.success(t("shareManager.filesUpdateSuccess"));
      onSuccess();
      setShareToManageFiles(null);
    } catch (error) {
      toast.error(t("shareManager.filesUpdateError"));
    }
  };

  const handleManageRecipients = async (shareId: string, recipients: string[]) => {
    try {
      await addRecipients(shareId, { emails: recipients });
      toast.success(t("shareManager.recipientsUpdateSuccess"));
      onSuccess();
      setShareToManageRecipients(null);
    } catch (error) {
      toast.error(t("shareManager.recipientsUpdateError"));
    }
  };

  const handleGenerateLink = async (shareId: string, alias: string) => {
    try {
      await createShareAlias(shareId, { alias });
      toast.success(t("shareManager.linkGenerateSuccess"));
      onSuccess();
    } catch (error) {
      toast.error(t("shareManager.linkGenerateError"));
      throw error;
    }
  };

  const handleNotifyRecipients = async (share: ListUserShares200SharesItem) => {
    const link = `${window.location.origin}/s/${share.alias?.alias}`;
    const loadingToast = toast.loading(t("shareManager.notifyLoading"));

    try {
      await notifyRecipients(share.id, { shareLink: link });
      toast.dismiss(loadingToast);
      toast.success(t("shareManager.notifySuccess"));
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t("shareManager.notifyError"));
    }
  };

  return {
    shareToDelete,
    shareToEdit,
    shareToManageFiles,
    shareToManageRecipients,
    shareToManageSecurity,
    shareToManageExpiration,
    shareToViewDetails,
    shareToGenerateLink,
    sharesToDelete,
    setShareToDelete,
    setShareToEdit,
    setShareToManageFiles,
    setShareToManageRecipients,
    setShareToManageSecurity,
    setShareToManageExpiration,
    setShareToViewDetails,
    setShareToGenerateLink,
    setSharesToDelete,
    handleDelete,
    handleBulkDelete,
    handleDeleteBulk,
    handleEdit,
    handleUpdateName,
    handleUpdateDescription,
    handleUpdateSecurity,
    handleUpdateExpiration,
    handleManageFiles,
    handleManageRecipients,
    handleGenerateLink,
    handleNotifyRecipients,
    setClearSelectionCallback,
  };
}
