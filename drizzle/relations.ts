import { relations } from "drizzle-orm";
import { users, groups, groupMembers, groupItems, groupActivityLogs } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  createdGroups: many(groups),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, { fields: [groups.createdBy], references: [users.id] }),
  members: many(groupMembers),
  items: many(groupItems),
  activityLogs: many(groupActivityLogs),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const groupItemsRelations = relations(groupItems, ({ one }) => ({
  group: one(groups, { fields: [groupItems.groupId], references: [groups.id] }),
  creator: one(users, { fields: [groupItems.createdBy], references: [users.id] }),
}));

export const groupActivityLogsRelations = relations(groupActivityLogs, ({ one }) => ({
  group: one(groups, { fields: [groupActivityLogs.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupActivityLogs.userId], references: [users.id] }),
  item: one(groupItems, { fields: [groupActivityLogs.itemId], references: [groupItems.id] }),
}));
