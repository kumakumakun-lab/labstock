import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createGroup,
  getUserGroups,
  getGroupDetail,
  getGroupMembers,
  joinGroupByInviteCode,
  leaveGroup,
  deleteGroup,
  getGroupItems,
  addGroupItem,
  updateGroupItem,
  deleteGroupItem,
  getGroupActivityLogs,
  getGroupAlerts,
} from "./group-db";

export const groupRouter = router({
  /** グループを作成する */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(500).nullable().optional(),
        displayName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createGroup(
        input.name,
        input.description ?? null,
        ctx.user.id,
        input.displayName
      );
      return result;
    }),

  /** ユーザーが所属するグループ一覧 */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserGroups(ctx.user.id);
  }),

  /** グループ詳細を取得する */
  detail: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const detail = await getGroupDetail(input.groupId, ctx.user.id);
      if (!detail) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "グループが見つからないか、アクセス権限がありません",
        });
      }
      return detail;
    }),

  /** グループのメンバー一覧 */
  members: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const members = await getGroupMembers(input.groupId, ctx.user.id);
      if (!members) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "グループのメンバーではありません",
        });
      }
      return members;
    }),

  /** 招待コードでグループに参加する */
  join: protectedProcedure
    .input(
      z.object({
        inviteCode: z.string().min(1),
        displayName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await joinGroupByInviteCode(
        input.inviteCode,
        ctx.user.id,
        input.displayName
      );
      if ("error" in result) {
        if (result.error === "invalid_code") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "無効な招待コードです",
          });
        }
        if (result.error === "already_member") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "既にこのグループのメンバーです",
          });
        }
      }
      return result;
    }),

  /** グループから退出する */
  leave: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await leaveGroup(input.groupId, ctx.user.id);
      if ("error" in result) {
        if (result.error === "not_member") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "グループのメンバーではありません",
          });
        }
        if (result.error === "owner_cannot_leave") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "オーナーはグループから退出できません。グループを削除してください。",
          });
        }
      }
      return result;
    }),

  /** グループを削除する（ownerのみ） */
  delete: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteGroup(input.groupId, ctx.user.id);
      if ("error" in result) {
        if (result.error === "not_found") {
          throw new TRPCError({ code: "NOT_FOUND", message: "グループが見つかりません" });
        }
        if (result.error === "not_owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "グループのオーナーのみ削除できます",
          });
        }
      }
      return result;
    }),

  // ─── グループ在庫アイテム ───

  items: router({
    /** グループの在庫アイテム一覧 */
    list: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const items = await getGroupItems(input.groupId, ctx.user.id);
        if (!items) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "グループのメンバーではありません",
          });
        }
        return items;
      }),

    /** グループに在庫アイテムを追加する */
    add: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          name: z.string().min(1).max(300),
          company: z.string().max(300).nullable().optional(),
          modelNumber: z.string().max(200).nullable().optional(),
          quantity: z.number().int().min(0).default(0),
          location: z.string().max(300).nullable().optional(),
          notes: z.string().nullable().optional(),
          imageUrl: z.string().nullable().optional(),
          alertThreshold: z.number().int().min(0).default(0),
          tags: z.array(z.string()).nullable().optional(),
          barcode: z.string().max(200).nullable().optional(),
          displayName: z.string().min(1).max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { groupId, displayName, ...itemData } = input;
        return addGroupItem(groupId, ctx.user.id, displayName, itemData);
      }),

    /** グループの在庫アイテムを更新する */
    update: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          itemId: z.number(),
          name: z.string().min(1).max(300).optional(),
          company: z.string().max(300).nullable().optional(),
          modelNumber: z.string().max(200).nullable().optional(),
          quantity: z.number().int().min(0).optional(),
          location: z.string().max(300).nullable().optional(),
          notes: z.string().nullable().optional(),
          imageUrl: z.string().nullable().optional(),
          alertThreshold: z.number().int().min(0).optional(),
          tags: z.array(z.string()).nullable().optional(),
          barcode: z.string().max(200).nullable().optional(),
          displayName: z.string().min(1).max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { groupId, itemId, displayName, ...updates } = input;
        return updateGroupItem(groupId, itemId, ctx.user.id, displayName, updates);
      }),

    /** グループの在庫アイテムを削除する */
    delete: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          itemId: z.number(),
          displayName: z.string().min(1).max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return deleteGroupItem(input.groupId, input.itemId, ctx.user.id, input.displayName);
      }),
  }),

  // ─── 活動ログ ───

  /** グループの活動ログを取得する */
  activityLogs: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await getGroupActivityLogs(
        input.groupId,
        ctx.user.id,
        input.limit,
        input.offset
      );
      if (!logs) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "グループのメンバーではありません",
        });
      }
      return logs;
    }),

  /** グループのアラート（閾値以下のアイテム）を取得する */
  alerts: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const alerts = await getGroupAlerts(input.groupId, ctx.user.id);
      if (!alerts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "グループのメンバーではありません",
        });
      }
      return alerts;
    }),
});
