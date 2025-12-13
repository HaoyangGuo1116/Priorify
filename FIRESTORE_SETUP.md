# Firestore 安全规则设置指南

如果您遇到"没有权限创建任务"的错误，请按照以下步骤配置 Firestore 安全规则：

## 方法 1：使用 Firebase Console（推荐）

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 选择您的项目（webdev-9a6e4）
3. 在左侧菜单中选择 **Firestore Database**
4. 点击 **规则** 标签
5. 将以下规则复制并粘贴到规则编辑器中：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tasks collection rules
    match /tasks/{taskId} {
      // Allow read if the user is authenticated and owns the task
      allow read: if request.auth != null &&
                     resource.data.userId == request.auth.uid;

      // Allow create if the user is authenticated and sets their own userId
      allow create: if request.auth != null &&
                       request.resource.data.userId == request.auth.uid;

      // Allow update if the user is authenticated and owns the task
      allow update: if request.auth != null &&
                       resource.data.userId == request.auth.uid &&
                       request.resource.data.userId == request.auth.uid;

      // Allow delete if the user is authenticated and owns the task
      allow delete: if request.auth != null &&
                       resource.data.userId == request.auth.uid;
    }

    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. 点击 **发布** 按钮

## 方法 2：使用 Firebase CLI

如果您使用 Firebase CLI，可以将 `firestore.rules` 文件部署：

```bash
firebase deploy --only firestore:rules
```

## 规则说明

这些安全规则确保：

- ✅ 只有已登录的用户可以创建任务
- ✅ 用户只能创建属于自己的任务（userId 必须匹配）
- ✅ 用户只能读取、更新和删除自己的任务
- ✅ 其他集合默认拒绝所有访问

## 临时测试规则（仅用于开发）

如果您只是想在开发时快速测试，可以使用以下临时规则（**不建议用于生产环境**）：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

这个规则允许任何已登录用户读写所有文档。**请仅在开发环境中使用！**
