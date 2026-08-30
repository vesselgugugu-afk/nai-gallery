<template>
  <div class="view-container active">
    <div class="admin-shell">
      <router-link to="/gallery" class="icon-btn back-btn" aria-label="返回">
        <svg viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </router-link>

      <div class="admin-header">
        <h1>管理后台</h1>
        <p>批次管理 / 上传作品 / 图片管理</p>
      </div>

      <!-- 统计仪表盘 (list view) -->
      <div v-if="view === 'list'" class="stats-dash">
        <div class="stat-card">
          <span class="stat-num">{{ stats.total_users }}</span>
          <span class="stat-label">用户</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ stats.total_unlocks }}</span>
          <span class="stat-label">解锁</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ stats.total_downloads }}</span>
          <span class="stat-label">下载</span>
        </div>
      </div>

      <!-- list 视图 -->
      <section v-if="view === 'list'" class="admin-card">
        <div class="list-toolbar">
          <h2>批次列表</h2>
          <div class="toolbar-actions">
            <button class="btn-primary" @click="view = 'create'">+ 新建批次</button>
            <button class="btn-more" @click.stop="showMoreMenu = !showMoreMenu">
              <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              <span>更多</span>
            </button>
            <div v-if="showMoreMenu" class="more-dropdown" @click.stop>
              <button class="btn-outline" @click="openAnnouncements(); showMoreMenu = false">公告管理</button>
              <button class="btn-outline" @click="openFeedbacks(); showMoreMenu = false">反馈查看</button>
              <button class="btn-outline" @click="openFilterWords(); showMoreMenu = false">过滤词</button>
              <button class="btn-outline" @click="openUsers(); showMoreMenu = false">用户管理</button>
              <button class="btn-outline" @click="openDownloads(); showMoreMenu = false">下载记录</button>
              <button class="btn-outline" @click="openLogins(); showMoreMenu = false">登录记录</button>
            </div>
          </div>
          <div class="toolbar-desktop-actions">
            <button class="btn-primary" @click="view = 'create'">+ 新建批次</button>
            <button class="btn-outline" @click="openAnnouncements">公告管理</button>
            <button class="btn-outline" @click="openFeedbacks">反馈查看</button>
            <button class="btn-outline" @click="openFilterWords">过滤词</button>
            <button class="btn-outline" @click="openUsers">用户管理</button>
            <button class="btn-outline" @click="openDownloads">下载记录</button>
            <button class="btn-outline" @click="openLogins">登录记录</button>
          </div>
        </div>

        <p v-if="batchLoading" class="admin-placeholder">加载中...</p>
        <p v-else-if="batchError" class="status-error">{{ batchError }}</p>
        <div v-else-if="!batches.length" class="empty-state">
          <p>还没有批次</p>
          <button class="btn-primary" @click="view = 'create'">+ 新建第一个批次</button>
        </div>

        <ul v-else class="batch-list">
          <li v-for="b in batches" :key="b.batch_id" class="batch-row-wrap">
            <div class="batch-row">
              <div class="batch-info">
                <span class="batch-name">{{ b.batch_name }}</span>
                <span class="batch-meta">{{ b.image_count }} 张图 · {{ b.group_count }} 组 · {{ b.unlock_count || 0 }}人解锁 · {{ b.download_count || 0 }}次下载</span>
                <span class="batch-date">{{ formatDate(b.created_at) }}</span>
                <span v-if="b.expire_at" class="batch-date">过期：{{ formatDate(b.expire_at) }}</span>
              </div>
              <div class="batch-actions">
                <label class="toggle-wrap" :title="b.is_active ? '已启用' : '已停用'">
                  <input type="checkbox" :checked="b.is_active" @change="toggleBatch(b)" />
                  <span class="toggle-track"><span class="toggle-thumb" /></span>
                </label>
                <button class="icon-btn small" title="上传到此批次" @click="selectForUpload(b)">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                </button>
                <button class="icon-btn small" title="图片管理" @click="openImagesView(b)">
                  <svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                </button>
               <button class="icon-btn small danger" title="删除批次" @click="confirmDeleteBatch(b)">
                 <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>
               </button>
                <button class="icon-btn small" title="批次设置" @click="openSettings(b)">
                  <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="1.5"/></svg>
                </button>
                <button class="icon-btn small" title="下载记录" @click="openBatchDownloads(b)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="icon-btn small" :title="expandedBatch === b.batch_id ? '收起' : '展开详情'" @click="toggleExpandBatch(b)">
                  <svg viewBox="0 0 24 24" :style="{ transform: expandedBatch === b.batch_id ? 'rotate(180deg)' : 'none' }"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
            </div>
            <!-- 展开的活动详情 -->
            <div v-if="expandedBatch === b.batch_id" class="batch-activity">
              <div v-if="activityLoading[b.batch_id]" class="admin-placeholder">加载中...</div>
              <div v-else-if="activityError[b.batch_id]" class="status-error">{{ activityError[b.batch_id] }}</div>
              <div v-else class="activity-grid">
                <div class="activity-col">
                  <h4>解锁用户</h4>
                  <p v-if="!activityCache[b.batch_id]?.unlocks?.length" class="no-data">暂无</p>
                  <ul v-else class="activity-list">
                    <li v-for="u in activityCache[b.batch_id].unlocks" :key="u.discord_id">
                      <strong>{{ u.username }}</strong>
                      <span class="activity-time">{{ formatDate(u.unlocked_at) }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- create 视图 -->
      <section v-if="view === 'create'" class="admin-card">
        <div class="list-toolbar">
          <h2>新建批次</h2>
          <button class="btn-outline" @click="view = 'list'">&larr; 返回列表</button>
        </div>
        <form @submit.prevent="createBatch" class="create-form">
          <label class="field">
            <span>批次名称 *</span>
            <input v-model="createForm.batch_name" required placeholder="例如：2026-10 月度合集" />
          </label>
          <label class="field">
            <span>批次 ID（可选）</span>
            <input v-model="createForm.batch_id" placeholder="留空自动生成" />
          </label>
          <label class="field">
            <span>过期时间（可选）</span>
            <input type="datetime-local" v-model="createForm.expire_at" />
          </label>
          <button type="submit" class="btn-primary" :disabled="creating">{{ creating ? '创建中...' : '创建批次' }}</button>
        </form>

        <div v-if="createdPassword" class="password-reveal">
          <p class="warn">请立即复制此密码，关闭后将永久不可见。</p>
          <code class="password-code">{{ createdPassword }}</code>
          <div class="password-actions">
            <button class="btn-outline" @click="copyPassword">复制密码</button>
            <button class="btn-primary" @click="goUploadCreated">立即上传</button>
          </div>
        </div>
        <p v-if="createError" class="status-error">{{ createError }}</p>
      </section>

      <!-- upload 视图 -->
      <section v-if="view === 'upload'" class="admin-card">
        <div class="list-toolbar">
          <h2>上传与导入</h2>
          <button class="btn-outline" @click="backToList">&larr; 返回列表</button>
        </div>

        <div class="upload-target">
          <span>目标批次：<strong>{{ uploadBatchName }}</strong></span>
        </div>

        <!-- 格式选择 -->
        <div class="upload-format-row">
          <span class="format-label">保存格式：</span>
          <label class="format-opt">
            <input type="radio" v-model="uploadFormat" value="png" />
            <span>保留原图 PNG</span>
          </label>
          <label class="format-opt">
            <input type="radio" v-model="uploadFormat" value="jpeg" />
            <span>压缩为 JPEG (quality 90)</span>
          </label>
        </div>

        <label class="file-drop" :class="{ drag: dragging }">
          <input type="file" multiple accept=".png,.txt" @change="onFileSelect" @click="resetFile" />
          <span v-if="!parsing && !entries.length">拖放或选择 PNG / TXT 文件</span>
          <span v-else-if="parsing">正在解析元数据...</span>
          <span v-else>已就绪 {{ entries.length }} 张图片</span>
          <span
            class="drop-hint"
            @dragenter.prevent="dragging = true"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          />
        </label>

        <!-- 分组预览 + 手动编辑 -->
        <div v-if="entries.length" class="group-preview">
          <div class="preview-toolbar">
            <button class="btn-outline" @click="addGroup">新建分组</button>
            <span class="hint">{{ groups.length }} 组 · {{ entries.length }} 张图</span>
          </div>
          <div v-for="g in groups" :key="g.id" class="group-block">
            <div class="group-head">
              <input
                v-model="g.title"
                class="group-title-input"
                :placeholder="g.id === '__ungrouped__' ? '未分组' : g.positive_prompt.slice(0,40)"
              />
              <span class="group-count">{{ g.imageIds.length }}</span>
              <input v-model="g.notes" class="group-notes-input" placeholder="分组备注..." />
              <button v-if="g.id !== '__ungrouped__'" class="icon-btn small" title="删除分组（图归入未分组）" @click="deleteGroup(g)">
                <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>
              </button>
            </div>
            <p v-if="g.positive_prompt" class="group-prompt">{{ g.positive_prompt.slice(0,120) }}{{ g.positive_prompt.length > 120 ? '...' : '' }}</p>
            <div class="thumb-row">
              <div v-for="id in g.imageIds" :key="id" class="thumb">
                <img :src="entryById(id).blobUrl" :alt="entryById(id).baseName" />
                <span class="thumb-name">{{ entryById(id).baseName }}</span>
                <span class="thumb-seed" v-if="entryById(id).meta?.seed">#{{ entryById(id).meta.seed }}</span>
                <span class="thumb-txt" v-if="entryById(id).txtFile">TXT</span>
                <select
                  class="thumb-move"
                  :value="entryById(id).groupId"
                  @change="moveImg(id, $event.target.value)"
                  title="移动到分组"
                >
                  <option v-for="og in groups" :key="og.id" :value="og.id">{{ og.title || (og.id === '__ungrouped__' ? '未分组' : '分组') }}</option>
                </select>
                <button class="thumb-expand" @click="toggleExpand(id)" title="查看提示词">...</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 展开的提示词详情 -->
        <div v-if="expandedId" class="prompt-detail">
          <div class="prompt-detail-head">
            <span>{{ entryById(expandedId)?.baseName }}</span>
            <button class="icon-btn small" @click="expandedId = null"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          </div>
          <h4>正面提示词</h4>
          <p class="prompt-text">{{ entryById(expandedId)?.meta?.positive_prompt || '(无)' }}</p>
          <h4>负面提示词</h4>
          <p class="prompt-text">{{ entryById(expandedId)?.meta?.negative_prompt || '(无)' }}</p>
        </div>

        <!-- 进度 + 提交 -->
        <div v-if="uploading" class="upload-progress">
          <p>{{ phaseLabel }}</p>
          <div class="progress-bar"><span :style="{ width: pct + '%' }" /></div>
        </div>

        <div v-if="uploadError" class="status-error">{{ uploadError }}</div>
        <div v-if="uploadResult" class="status-ok">
          上传完成：{{ uploadResult.image_count }} 张图，{{ uploadResult.group_count }} 个分组。
        </div>

        <button
          v-if="entries.length && !uploading"
          class="btn-primary"
          @click="submitUpload"
        >提交上传（{{ entries.length }} 张图）</button>

        <p v-if="entries.length && totalFiles > 600" class="warn">文件数超过 600 上限，请分批上传。</p>
      </section>

      <!-- ========== 图片管理视图 ========== -->
      <section v-if="view === 'images'" class="admin-card images-shell">
        <div class="list-toolbar">
          <h2>图片管理 — {{ imagesBatchName }}</h2>
          <button class="btn-outline" @click="backToList">&larr; 返回列表</button>
        </div>

        <div class="images-layout">
          <aside class="images-sidebar">
            <h4>分组筛选</h4>
            <ul class="group-tree">
              <li :class="{ active: imagesGroupFilter === '' }" @click="imagesGroupFilter = ''; imagesPage = 1; fetchImages()">
                全部 ({{ imagesTotalAll }})
              </li>
              <li
                v-for="g in imageGroups"
                :key="g.group_id"
                :class="{ active: imagesGroupFilter === g.group_id }"
                @click="imagesGroupFilter = g.group_id; imagesPage = 1; fetchImages()"
              >
                {{ g.title || '未命名' }}
              </li>
            </ul>
            <div class="new-group-zone">
              <button v-if="!showNewGroupInput" class="btn-outline tiny" @click="showNewGroupInput = true">+ 新建分组</button>
              <form v-else class="new-group-form" @submit.prevent="createGroup">
                <input v-model="newGroupName" placeholder="分组名称" class="new-group-input" />
                <button type="submit" class="btn-primary tiny">确定</button>
                <button type="button" class="btn-outline tiny" @click="showNewGroupInput = false; newGroupName = ''">取消</button>
              </form>
            </div>
          </aside>

          <div class="images-main">
            <div v-if="imagesSelected.size" class="images-batch-bar">
              <span>已选 {{ imagesSelected.size }} 张</span>
              <button class="btn-outline" @click="batchMoveImages">批量移动</button>
              <button class="btn-outline" @click="batchCompressImages">批量压缩</button>
              <button class="btn-danger" @click="batchDeleteImages">批量删除</button>
              <button class="btn-outline" @click="imagesSelected.clear()">取消选择</button>
            </div>

            <p v-if="imagesLoading" class="admin-placeholder">加载中...</p>
            <p v-else-if="imagesError" class="status-error">{{ imagesError }}</p>
            <p v-else-if="!imagesData.length" class="admin-placeholder">此批次暂无图片</p>

            <div v-else class="images-grid">
              <div
                v-for="img in imagesData"
                :key="img.image_id"
                class="image-card"
                :class="{ selected: imagesSelected.has(img.image_id) }"
              >
                <div class="image-card-check" @click="toggleImageSelect(img.image_id)">
                  <span class="check-box">{{ imagesSelected.has(img.image_id) ? '✓' : '' }}</span>
                </div>
                <img
                  v-if="img.preview_r2_key"
                  :src="'/api/admin/preview/' + encodeURIComponent(img.image_id) + '?batch_id=' + encodeURIComponent(imagesBatchId)"
                  :alt="img.prompt_preview"
                  class="image-card-img"
                  loading="lazy"
                />
                <div v-else class="image-card-placeholder">无预览</div>
                <div class="image-card-info">
                  <p class="image-card-prompt">{{ img.prompt_preview?.slice(0, 50) || '(无)' }}</p>
                  <p class="image-card-meta">
                    <span v-if="img.seed">seed: {{ img.seed }}</span>
                    <span v-if="img.width">{{ img.width }}×{{ img.height }}</span>
                    <span>{{ formatDate(img.created_at) }}</span>
                  </p>
                  <p class="image-card-group">{{ img.group_title }}</p>
                  <p class="image-card-dl" v-if="img.download_count" @click.stop="toggleImageDownloaders(img)">
                    ↓ {{ img.download_count }}次下载
                  </p>
                </div>
                <div class="image-card-actions">
                  <button class="btn-outline tiny" @click="startMoveImage(img)">移动</button>
                  <button class="btn-outline tiny" @click="startCompressImage(img)">压缩</button>
                  <button class="btn-danger tiny" @click="confirmDeleteImage(img)">删除</button>
                </div>
                  <div v-if="imageDownloaders[img.image_id]" class="image-downloaders">
                    <p v-if="imageDlLoading[img.image_id]" class="admin-placeholder" style="font-size:10px">加载中...</p>
                    <ul v-else class="activity-list">
                      <li v-for="dl in imageDownloaders[img.image_id]" :key="dl.discord_id + dl.timestamp">
                        <strong>{{ dl.username }}</strong>
                        <span class="activity-time">{{ formatDate(dl.timestamp) }}</span>
                      </li>
                    </ul>
                  </div>

              </div>
            </div>

            <div v-if="imagesTotal > 50" class="images-pager">
              <button :disabled="imagesPage <= 1" @click="imagesPage--; fetchImages()">&lt;</button>
              <span>{{ imagesPage }} / {{ Math.ceil(imagesTotal / 50) }}</span>
              <button :disabled="imagesPage >= Math.ceil(imagesTotal / 50)" @click="imagesPage++; fetchImages()">&gt;</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ====== 弹窗层 ====== -->

    <!-- 删除确认弹窗 -->

    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-card">
          <h3>确认删除</h3>
          <p>确定要删除批次 <strong>{{ deleteTarget.batch_name }}</strong> 吗？</p>
          <p class="modal-warn">此操作不可撤销，批次内所有图片、分组、收藏记录将被一并删除。</p>
          <div class="modal-actions">
            <button class="btn-outline" @click="deleteTarget = null">取消</button>
            <button class="btn-danger" :disabled="deleting" @click="doDeleteBatch">{{ deleting ? '删除中...' : '确认删除' }}</button>
          </div>
          <p v-if="deleteError" class="status-error">{{ deleteError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- 公告管理视图 -->
    <section v-if="view === 'announcements'" class="admin-card">
      <div class="list-toolbar">
        <h2>公告管理</h2>
        <button class="btn-outline" @click="view = 'list'">&larr; 返回列表</button>
      </div>

      <div class="announce-list" v-if="!editingAnnouncement">
        <div v-if="!allAnnouncements.length" class="empty-state">
          <p>还没有公告</p>
          <button class="btn-primary" @click="newAnnouncement">+ 新建公告</button>
        </div>
        <ul v-else class="batch-list">
          <li v-for="a in allAnnouncements" :key="a.id" class="batch-row-wrap">
            <div class="batch-row">
              <div class="batch-info">
                <span class="batch-name">{{ a.title }}</span>
                <span class="batch-meta">排序：{{ a.sort_order }} · {{ a.is_active ? '已启用' : '已停用' }} · {{ formatDate(a.created_at) }}</span>
              </div>
              <div class="batch-actions">
                <label class="toggle-wrap">
                  <input type="checkbox" :checked="a.is_active" @change="toggleAnnouncement(a)" />
                  <span class="toggle-track"><span class="toggle-thumb" /></span>
                </label>
                <button class="icon-btn small" title="上移" @click="moveAnnouncement(a, -1)" :disabled="a.sort_order <= 0">
                  <svg viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg>
                </button>
                <button class="icon-btn small" title="下移" @click="moveAnnouncement(a, 1)">
                  <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <button class="icon-btn small" title="编辑" @click="editAnnouncement(a)">
                  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button class="icon-btn small danger" title="删除" @click="deleteAnnouncement(a)">
                  <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>
                </button>
              </div>
            </div>
          </li>
        </ul>
        <button v-if="allAnnouncements.length" class="btn-outline" style="margin-top: 12px" @click="newAnnouncement">+ 新建公告</button>
      </div>

      <!-- 新建/编辑公告表单 -->
      <form v-if="editingAnnouncement" @submit.prevent="saveAnnouncement" class="create-form">
        <label class="field">
          <span>标题 *</span>
          <input v-model="announceForm.title" required placeholder="公告标题" />
        </label>
        <label class="field">
          <span>内容 *</span>
          <textarea v-model="announceForm.content" rows="4" required placeholder="公告正文..." class="settings-textarea"></textarea>
        </label>
        <label class="field">
          <span>图片 URL（可选）</span>
          <input v-model="announceForm.image_url" placeholder="https://..." />
        </label>
        <div style="display: flex; gap: 12px">
          <button type="submit" class="btn-primary" :disabled="announceSaving">
            {{ announceSaving ? '保存中...' : '保存公告' }}
          </button>
          <button type="button" class="btn-outline" @click="cancelEditAnnouncement">取消</button>
        </div>
        <p v-if="announceError" class="status-error">{{ announceError }}</p>
      </form>

      <!-- 宣誓文本编辑 -->
      <div class="pledge-editor">
        <h3>用户宣誓文本</h3>
        <p class="pledge-hint">修改后所有用户下次访问需重新宣誓。</p>
        <textarea v-model="pledgeTextAdmin" rows="3" class="settings-textarea" placeholder="留空则不启用宣誓..."></textarea>
        <button class="btn-outline" :disabled="pledgeSaving" @click="savePledgeText" style="margin-top: 12px">
          {{ pledgeSaving ? '保存中...' : '保存宣誓文本' }}
        </button>
      </div>
    </section>

    <!-- 过滤词管理视图 -->
    <section v-if="view === 'filter-words'" class="admin-card">
      <div class="list-toolbar">
        <h2>过滤词管理</h2>
        <button class="btn-outline" @click="view = 'list'">← 返回列表</button>
      </div>
      <p class="pledge-hint">上传时忽略这些词，同一串的不同变体（如 1girl / 1boy）会自动归入一组。原提示词不受影响。</p>
      <div class="filter-tags">
        <span v-for="(w, i) in filterWords" :key="i" class="filter-tag">
          {{ w }}
          <button class="tag-remove" @click="filterWords.splice(i, 1)">×</button>
        </span>
        <span v-if="!filterWords.length" style="opacity:0.4;font-size:13px">还没有过滤词，在下方添加</span>
      </div>
      <div style="display:flex;gap:12px;margin-top:12px">
        <input v-model="newFilterWord" class="field-input" placeholder="输入过滤词，如 1girl" style="flex:1" @keyup.enter="addFilterWord" />
        <button class="btn-outline" @click="addFilterWord">添加</button>
      </div>
      <div style="margin-top:16px">
        <button class="btn-primary" :disabled="filterSaving" @click="doSaveFilterWords">
          {{ filterSaving ? '保存中...' : '保存过滤词' }}
        </button>
      </div>
    </section>

    <!-- 反馈查看视图 -->
    <section v-if="view === 'feedbacks'" class="admin-card">
      <div class="list-toolbar">
        <h2>反馈列表</h2>
        <button class="btn-outline" @click="view = 'list'">← 返回列表</button>
      </div>
      <div v-if="feedbackLoading" class="admin-placeholder">加载中...</div>
      <div v-else-if="!feedbacks.length" class="empty-state">
        <p>暂无反馈</p>
      </div>
      <ul v-else class="batch-list">
        <li v-for="f in feedbacks" :key="f.id" class="batch-row-wrap">
          <div class="batch-row">
            <div class="batch-info">
              <span class="batch-name">{{ f.username || '匿名' }}</span>
              <span class="batch-meta">{{ f.content?.slice(0, 200) }}</span>
              <span class="batch-meta">{{ formatDate(f.created_at) }}</span>
            </div>
            <div class="batch-actions">
              <button class="icon-btn small" title="删除" @click="deleteFeedback(f)">×</button>
            </div>
          </div>
        </li>
      </ul>
      <div v-if="feedbackTotal > feedbacks.length" style="text-align:center;margin-top:12px">
        <button class="btn-outline" @click="fetchFeedbacks(feedbacks.length)">加载更多</button>
      </div>
    </section>

    <!-- 用户管理 -->
    <section v-if="view === 'users'" class="admin-card">
      <div class="list-toolbar">
        <h2>用户管理</h2>
        <button class="btn-outline" @click="view = 'list'">← 返回列表</button>
      </div>
      <div v-if="usersLoading" class="admin-placeholder">加载中...</div>
      <p v-else-if="usersError" class="status-error">{{ usersError }}</p>
      <div v-else-if="!users.length" class="empty-state"><p>暂无用户</p></div>
      <table v-else class="data-table">
        <thead>
          <tr><th>用户</th><th>角色</th><th>登录标记</th><th>解锁数</th><th>下载数</th><th>最后活跃</th><th>操作</th></tr>
        </thead>
        <tbody>
          <template v-for="u in users" :key="u.discord_id">
            <tr>
              <td>
                <button class="icon-btn small expand-arrow" :class="{ open: expandedUser === u.discord_id }" @click="toggleUserDownloads(u)" style="width:20px;height:20px;border-radius:50%;font-size:10px;padding:0;margin-right:6px;display:inline-flex;align-items:center;justify-content:center;">▶</button>
                <strong>{{ u.username }}</strong><br /><small>{{ u.discord_id }}</small>
              </td>
              <td><span :class="['role-badge', u.role]">{{ u.role === 'admin' ? '管理员' : '用户' }}</span></td>
              <td><span v-if="u.last_login_at" class="login-marker" :title="formatDate(u.last_login_at)">已登录</span><span v-else class="no-data">未登录</span></td>
              <td>{{ u.unlock_count }}</td>
              <td>{{ u.download_count }}</td>
              <td>{{ u.last_active ? formatDate(u.last_active) : '从未' }}</td>
              <td>
                <button v-if="u.role === 'user'" class="btn-outline small" @click="promoteUser(u.discord_id)">提权</button>
                <button v-else-if="u.role === 'admin'" class="btn-outline small" @click="demoteUser(u.discord_id)">降权</button>
                <button class="btn-outline small danger-text" @click="blockUser(u.discord_id)">拉黑</button>
                <button class="btn-outline small" @click="whitelistUser(u.discord_id)">白名单</button>
              </td>
            </tr>
            <tr v-if="expandedUser === u.discord_id" class="user-downloads-row">
              <td :colspan="7">
                <div v-if="userDownloadsLoading[u.discord_id]" class="admin-placeholder" style="font-size:12px">加载中...</div>
                <p v-else-if="userDownloadsError[u.discord_id]" class="status-error" style="font-size:12px">{{ userDownloadsError[u.discord_id] }}</p>
                <div v-else-if="!userDownloads[u.discord_id]?.length" class="no-data" style="padding:8px">暂无下载记录</div>
                <table v-else class="inner-table">
                  <thead><tr><th>批次名称</th><th>下载图片数</th><th>最后下载时间</th></tr></thead>
                  <tbody><tr v-for="b in userDownloads[u.discord_id]" :key="b.batch_id">
                    <td>{{ b.batch_name || b.batch_id }}</td>
                    <td>{{ b.image_count }}</td>
                    <td>{{ formatDate(b.last_download) }}</td>
                  </tr></tbody>
                </table>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div class="blacklist-panel">
        <div class="list-toolbar">
          <h3>黑名单</h3>
        </div>
        <form class="filter-row blacklist-form" @submit.prevent="addBlockedUser">
          <textarea v-model="blacklistForm.rawIds" class="filter-input blacklist-ids" rows="3" placeholder="输入一个或多个 Discord 用户 ID，用逗号、空格或换行分隔（可提前拉黑未登录用户）" required></textarea>
          <input v-model="blacklistForm.note" class="filter-input" placeholder="备注（可选，批量时共用）" />
          <button class="btn-danger" type="submit" :disabled="blacklistSaving">{{ blacklistSaving ? '处理中...' : '批量拉黑' }}</button>
        </form>
        <p v-if="blacklistError" class="status-error">{{ blacklistError }}</p>
        <p v-if="blacklistSuccess" class="status-ok">{{ blacklistSuccess }}</p>
        <div v-if="!blacklist.length" class="empty-state"><p>暂无黑名单用户</p></div>
        <table v-else class="data-table">
          <thead><tr><th>Discord ID</th><th>备注</th><th>加入时间</th><th>操作</th></tr></thead>
          <tbody><tr v-for="b in blacklist" :key="b.discord_id">
            <td>{{ b.discord_id }}</td><td>{{ b.note || '—' }}</td><td>{{ formatDate(b.created_at) }}</td>
            <td><button class="btn-outline small" @click="unblockUser(b.discord_id)">解除拉黑</button></td>
          </tr></tbody>
        </table>
      </div>
      <div class="whitelist-panel">
        <div class="list-toolbar">
          <h3>个人白名单</h3>
        </div>
        <p class="pledge-hint">加入个人白名单的用户，可免除"服务器 / 身份组黑名单"的拦截；个人黑名单仍然绝对生效，无法被豁免。</p>
        <form class="filter-row blacklist-form" @submit.prevent="addWhitelistedUser">
          <textarea v-model="whitelistForm.rawIds" class="filter-input blacklist-ids" rows="3" placeholder="输入一个或多个 Discord 用户 ID，用逗号、空格或换行分隔" required></textarea>
          <input v-model="whitelistForm.note" class="filter-input" placeholder="备注（可选，批量时共用）" />
          <button class="btn-danger" type="submit" :disabled="whitelistSaving">{{ whitelistSaving ? '处理中...' : '加入白名单' }}</button>
        </form>
        <p v-if="whitelistError" class="status-error">{{ whitelistError }}</p>
        <p v-if="whitelistSuccess" class="status-ok">{{ whitelistSuccess }}</p>
        <div v-if="!whitelist.length" class="empty-state"><p>暂无白名单用户</p></div>
        <table v-else class="data-table">
          <thead><tr><th>Discord ID</th><th>备注</th><th>加入时间</th><th>操作</th></tr></thead>
          <tbody><tr v-for="w in whitelist" :key="w.discord_id">
            <td>{{ w.discord_id }}</td><td>{{ w.note || '—' }}</td><td>{{ formatDate(w.created_at) }}</td>
            <td><button class="btn-outline small" @click="unwhitelistUser(w.discord_id)">移除白名单</button></td>
          </tr></tbody>
        </table>
      </div>
      <div class="guild-access-panel">
        <div class="list-toolbar">
          <h3>服务器白名单 / 黑名单</h3>
        </div>
        <p class="pledge-hint">粘贴 Discord 邀请链接、邀请码或服务器 ID，解析后可加入名单。服务器黑名单优先：命中黑名单即拦截（除非该用户在"个人白名单"中）。服务器白名单为空时不限制；有白名单时用户必须命中其中一个服务器或身份组。</p>
        <form class="filter-row" @submit.prevent="resolveGuildInvite">
          <input v-model="guildInvite" class="filter-input" placeholder="例如 https://discord.gg/xxxx、邀请码或服务器 ID" />
          <button class="btn-outline" type="submit" :disabled="guildResolving">{{ guildResolving ? '解析中...' : '解析' }}</button>
        </form>
        <div v-if="guildResolveResult" class="guild-resolve-card">
          <div class="guild-resolve-info">
            <strong>{{ guildResolveResult.guild_name || '未命名服务器' }}</strong>
            <span class="guild-id">{{ guildResolveResult.guild_id }}</span>
            <span v-if="guildResolveResult.member_count != null" class="guild-meta">约 {{ guildResolveResult.member_count }} 人</span>
          </div>
          <div class="guild-role-row">
            <input v-model="guildNameOverride" class="filter-input" placeholder="服务器名称（可选，填 ID 且名称空白时可手动补上）" />
          </div>
          <div class="guild-role-row">
            <input v-model="guildRoleId" class="filter-input" placeholder="身份组 ID（可选，留空则整个服务器）" />
            <input v-model="guildRoleName" class="filter-input" placeholder="身份组名（可选）" />
          </div>
          <div class="guild-resolve-actions">
            <button class="btn-outline small" @click="addGuildToList('whitelist')">加入白名单</button>
            <button class="btn-danger small" @click="addGuildToList('blacklist')">加入黑名单</button>
          </div>
        </div>
        <p v-if="guildError" class="status-error">{{ guildError }}</p>

        <div class="guild-list-row">
          <div class="guild-list-col">
            <h4>白名单</h4>
            <p v-if="!guildAccess.whitelist.length" class="no-data">暂无服务器</p>
            <table v-else class="data-table">
              <thead><tr><th>服务器</th><th>身份组</th><th>成员</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="g in guildAccess.whitelist" :key="g.guild_id + ':' + (g.role_id || '')">
                  <td><strong>{{ g.guild_name || '未命名服务器' }}</strong><br /><small>{{ g.guild_id }}</small></td>
                  <td>{{ g.role_id ? (g.role_name || g.role_id) : '整个服务器' }}</td>
                  <td>{{ g.member_count != null ? '约 ' + g.member_count + ' 人' : '—' }}</td>
                  <td><button class="btn-outline small" @click="removeGuildFromList('whitelist', g.guild_id, g.role_id)">移除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="guild-list-col">
            <h4>黑名单</h4>
            <p v-if="!guildAccess.blacklist.length" class="no-data">暂无服务器</p>
            <table v-else class="data-table">
              <thead><tr><th>服务器</th><th>身份组</th><th>成员</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="g in guildAccess.blacklist" :key="g.guild_id + ':' + (g.role_id || '')">
                  <td><strong>{{ g.guild_name || '未命名服务器' }}</strong><br /><small>{{ g.guild_id }}</small></td>
                  <td>{{ g.role_id ? (g.role_name || g.role_id) : '整个服务器' }}</td>
                  <td>{{ g.member_count != null ? '约 ' + g.member_count + ' 人' : '—' }}</td>
                  <td><button class="btn-outline small" @click="removeGuildFromList('blacklist', g.guild_id, g.role_id)">移除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- 下载记录 -->
    <section v-if="view === 'downloads'" class="admin-card">
      <div class="list-toolbar">
        <h2>下载记录</h2>
        <button class="btn-outline" @click="view = 'list'">← 返回列表</button>
      </div>
      <div class="filter-row">
        <input v-model="dlUserFilter" placeholder="按用户ID筛选..." class="filter-input" @input="debounceFetchDownloads" />
        <input v-model="dlBatchFilter" placeholder="按批次ID筛选..." class="filter-input" @input="debounceFetchDownloads" />
      </div>
      <div v-if="dlLoading" class="admin-placeholder">加载中...</div>
      <p v-else-if="downloadsError" class="status-error">{{ downloadsError }}</p>
      <div v-else-if="!downloads.length" class="empty-state"><p>暂无记录</p></div>
      <table v-else class="data-table">
        <thead>
          <tr><th>用户</th><th>图片</th><th>批次</th><th>类型</th><th>时间</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in downloads" :key="d.id">
            <td><strong>{{ d.username }}</strong></td>
            <td><small>{{ d.image_id }}</small></td>
            <td>{{ d.batch_name || d.batch_id }}</td>
            <td>{{ d.asset === 'txt' ? 'TXT' : '图片' }}</td>
            <td>{{ formatDate(d.timestamp || d.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="dlTotal > downloads.length" style="text-align:center;margin-top:12px">
        <button class="btn-outline" @click="fetchDownloads(downloads.length)">加载更多</button>
      </div>
    </section>

    <!-- 登录记录 -->
    <section v-if="view === 'logins'" class="admin-card">
      <div class="list-toolbar">
        <h2>登录记录</h2>
        <div class="toolbar-actions">
          <button class="btn-outline" @click="fetchLogins()">刷新</button>
          <button class="btn-outline" @click="view = 'list'">← 返回列表</button>
        </div>
      </div>
      <div v-if="loginsLoading" class="admin-placeholder">加载中...</div>
      <p v-else-if="loginsError" class="status-error">{{ loginsError }}</p>
      <div v-else-if="!logins.length" class="empty-state"><p>暂无登录记录</p></div>
      <table v-else class="data-table">
        <thead>
          <tr><th>用户</th><th>状态</th><th>Discord ID</th><th>IP</th><th>登录时间</th></tr>
        </thead>
        <tbody>
          <tr v-for="l in logins" :key="l.id">
            <td><strong>{{ l.username || '未知用户' }}</strong></td>
            <td>
              <span v-if="l.result === 'blocked'" class="role-badge" style="color:#d64545">已拦截</span>
              <span v-else class="role-badge" style="color:#2f9e44">成功</span>
              <div v-if="l.result === 'blocked' && l.reason" class="batch-meta">{{ loginReasonLabel(l.reason) }}</div>
            </td>
            <td><small>{{ l.discord_id }}</small></td>
            <td><small>{{ l.ip_hash ? l.ip_hash.slice(-4) : '—' }}</small></td>
            <td>{{ formatDate(l.timestamp) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="loginsTotal > logins.length" class="batch-meta" style="margin-top:10px">仅显示最近 {{ logins.length }} 条，共 {{ loginsTotal }} 条。</p>
    </section>

    <!-- 批次下载详情 -->
    <section v-if="view === 'batch-downloads'" class="admin-card">
      <div class="list-toolbar">
        <h2>批次下载记录 — {{ batchDownloadsName }}</h2>
        <button class="btn-outline" @click="view = 'list'">← 返回列表</button>
      </div>
      <div v-if="batchDlLoading" class="admin-placeholder">加载中...</div>
      <p v-else-if="batchDlError" class="status-error">{{ batchDlError }}</p>
      <div v-else-if="!batchDownloadsData.length" class="empty-state"><p>暂无下载记录</p></div>
      <table v-else class="data-table">
        <thead>
          <tr><th>用户</th><th>图片</th><th>类型</th><th>时间</th><th>IP</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in batchDownloadsData" :key="d.id">
            <td><strong>{{ d.username }}</strong></td>
            <td>
              <div class="dl-img-row">
                <img
                  v-if="d.image_id"
                  :src="'/api/admin/preview/' + encodeURIComponent(d.image_id) + '?batch_id=' + encodeURIComponent(d.batch_id)"
                  class="dl-thumb"
                  loading="lazy"
                />
                <span class="dl-prompt">{{ (d.prompt_preview || '').slice(0, 40) }}</span>
              </div>
            </td>
            <td>{{ d.asset === 'txt' ? 'TXT' : '图片' }}</td>
            <td>{{ formatDate(d.timestamp) }}</td>
            <td><small>{{ (d.ip_hash || '').slice(-4) }}</small></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 批次设置弹窗 -->
    <Teleport to="body">
      <div v-if="settingsTarget" class="modal-overlay" @click.self="closeSettings">
        <div class="modal-card settings-modal">
          <h3>批次设置 — {{ settingsTarget.batch_name }}</h3>

          <label class="field">
            <span>备注</span>
            <textarea v-model="settingsNotes" rows="3" placeholder="批次描述、策展说明..." class="settings-textarea"></textarea>
          </label>

          <label class="field">
            <span>封面图片 <small>(点击选取)</small></span>
          </label>
          <p v-if="settingsLoading" class="admin-placeholder">加载图片中...</p>
          <div v-else-if="!settingsImages.length" class="admin-placeholder">此批次暂无图片</div>
          <div v-else class="cover-grid">
            <div
              v-for="img in settingsImages"
              :key="img.image_id"
              class="cover-thumb"
              :class="{ selected: settingsCoverId === img.image_id }"
              @click="settingsCoverId = img.image_id"
            >
              <img :src="img.preview_url" :alt="img.prompt_preview" />
            </div>
          </div>

          <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
            <button class="btn-outline" @click="settingsCoverId = null" v-if="settingsCoverId">清除封面（使用默认）</button>
            <button class="btn-outline" @click="resetBatchPassword(settingsTarget.batch_id)" :disabled="resetPwdLoading">{{ resetPwdLoading ? '处理中...' : '设置/重置密码' }}</button>
            <button class="btn-outline" @click="closeSettings">取消</button>
            <button class="btn-primary" :disabled="settingsSaving" @click="saveSettings">{{ settingsSaving ? '保存中...' : '保存设置' }}</button>
          </div>
          <div v-if="newPassword" class="new-pwd-display" style="margin-top:12px;padding:8px 12px;background:var(--glass-bg);border-radius:8px">
            新密码：<code style="font-size:16px;font-weight:bold">{{ newPassword }}</code>
            <button class="btn-outline small" @click="copyToClipboard(newPassword)" style="margin-left:8px">复制</button>
          </div>
          <p v-if="settingsError" class="status-error">{{ settingsError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- 删除图片确认 -->
    <Teleport to="body">
      <div v-if="deleteImageTarget" class="modal-overlay" @click.self="deleteImageTarget = null">
        <div class="modal-card">
          <h3>确认删除图片</h3>
          <p>{{ deleteImageTarget.prompt_preview?.slice(0, 60) || '(无提示词)' }}</p>
          <p class="modal-warn">此操作不可撤销。</p>
          <div class="modal-actions">
            <button class="btn-outline" @click="deleteImageTarget = null">取消</button>
            <button class="btn-danger" :disabled="deletingImage" @click="doDeleteImage">{{ deletingImage ? '删除中...' : '确认删除' }}</button>
          </div>
          <p v-if="deleteImageError" class="status-error">{{ deleteImageError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- 移动图片分组 -->
    <Teleport to="body">
      <div v-if="moveImageTarget" class="modal-overlay" @click.self="moveImageTarget = null">
        <div class="modal-card">
          <h3>移动图片到分组</h3>
          <p>{{ moveImageTarget.prompt_preview?.slice(0, 60) || '(无提示词)' }}</p>
          <select v-model="moveImageToGroupId" class="move-select">
            <option v-for="g in imageGroups" :key="g.group_id" :value="g.group_id">{{ g.title || '未命名' }}</option>
          </select>
          <div class="modal-actions">
            <button class="btn-outline" @click="moveImageTarget = null">取消</button>
            <button class="btn-primary" :disabled="movingImage" @click="doMoveImage">{{ movingImage ? '移动中...' : '确认移动' }}</button>
          </div>
          <p v-if="moveImageError" class="status-error">{{ moveImageError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- 批量移动确认 -->
    <Teleport to="body">
      <div v-if="batchMoveDialog" class="modal-overlay" @click.self="batchMoveDialog = false">
        <div class="modal-card">
          <h3>批量移动 {{ imagesSelected.size }} 张图片</h3>
          <select v-model="moveImageToGroupId" class="move-select">
            <option v-for="g in imageGroups" :key="g.group_id" :value="g.group_id">{{ g.title || '未命名' }}</option>
          </select>
          <div class="modal-actions">
            <button class="btn-outline" @click="batchMoveDialog = false">取消</button>
            <button class="btn-primary" :disabled="movingImage" @click="doBatchMove">{{ movingImage ? '移动中...' : '确认移动' }}</button>
          </div>
          <p v-if="moveImageError" class="status-error">{{ moveImageError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- 压缩确认 -->
    <Teleport to="body">
      <div v-if="compressTarget" class="modal-overlay" @click.self="compressTarget = null">
        <div class="modal-card">
          <h3>压缩归档</h3>
          <p>将图片转为 JPEG (quality 90)，原图将被替换。</p>
          <p>{{ compressTarget.prompt_preview?.slice(0, 60) || '(无提示词)' }}</p>
          <div class="modal-actions">
            <button class="btn-outline" @click="compressTarget = null">取消</button>
            <button class="btn-primary" :disabled="compressing" @click="doCompressImage">{{ compressing ? '压缩中...' : '确认压缩' }}</button>
          </div>
          <p v-if="compressError" class="status-error">{{ compressError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- 批量压缩确认 -->
    <Teleport to="body">
      <div v-if="batchCompressDialog" class="modal-overlay" @click.self="batchCompressDialog = false">
        <div class="modal-card">
          <h3>批量压缩 {{ imagesSelected.size }} 张图片</h3>
          <p>所有图片将转为 JPEG (quality 90)，原图将被替换。此操作不可撤销。</p>
          <div class="modal-actions">
            <button class="btn-outline" @click="batchCompressDialog = false">取消</button>
            <button class="btn-primary" :disabled="compressing" @click="doBatchCompress">{{ compressing ? '压缩中...' : '确认压缩' }}</button>
          </div>
          <p v-if="compressError" class="status-error">{{ compressError }}</p>
          <div v-if="compressProgress" class="upload-progress" style="margin-top:12px">
            <p>压缩进度：{{ compressProgress }}</p>
            <div class="progress-bar"><span :style="{ width: compressPct + '%' }" /></div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 批量删除确认 -->
    <Teleport to="body">
      <div v-if="batchDeleteDialog" class="modal-overlay" @click.self="batchDeleteDialog = false">
        <div class="modal-card">
          <h3>确认批量删除</h3>
          <p>确定要删除选中的 <strong>{{ imagesSelected.size }}</strong> 张图片吗？</p>
          <p class="modal-warn">此操作不可撤销。</p>
          <div class="modal-actions">
            <button class="btn-outline" @click="batchDeleteDialog = false">取消</button>
            <button class="btn-danger" :disabled="deletingImage" @click="doBatchDelete">{{ deletingImage ? '删除中...' : '确认删除' }}</button>
          </div>
          <p v-if="deleteImageError" class="status-error">{{ deleteImageError }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { apiFetch } from '../lib/api.js';
import { buildUploadPlan, makeThumbnail, uploadBatch, moveEntryToGroup, compressToJpeg, SIGN_FILE_LIMIT } from '../lib/upload.js';

const view = ref('list');
const showMoreMenu = ref(false);
const filterWords = ref([]);
const newFilterWord = ref("");
const filterSaving = ref(false);

// ---- 统计仪表盘 ----
const stats = reactive({ total_users: 0, total_unlocks: 0, total_downloads: 0 });

const users = ref([]);
const blacklist = ref([]);
const blacklistForm = ref({ rawIds: '', note: '' });
const blacklistSaving = ref(false);
const blacklistError = ref('');
const blacklistSuccess = ref('');
const whitelist = ref([]);
const whitelistForm = ref({ rawIds: '', note: '' });
const whitelistSaving = ref(false);
const whitelistError = ref('');
const whitelistSuccess = ref('');
const usersLoading = ref(false);
const usersError = ref('');
const guildAccess = reactive({ whitelist: [], blacklist: [] });
const guildInvite = ref('');
const guildNameOverride = ref('');
const guildRoleId = ref('');
const guildRoleName = ref('');
const guildResolving = ref(false);
const guildResolveResult = ref(null);
const guildSaving = ref(false);
const guildError = ref('');
const downloads = ref([]);
const dlLoading = ref(false);
const downloadsError = ref('');
const dlTotal = ref(0);
const dlUserFilter = ref('');
const dlBatchFilter = ref('');
let dlDebounceTimer = null;

// ---- 登录记录 ----
const logins = ref([]);
const loginsLoading = ref(false);
const loginsError = ref('');
const loginsTotal = ref(0);

// ---- 批次下载详情 ----
const batchDownloadsId = ref('');
const batchDownloadsName = ref('');
const batchDownloadsData = ref([]);
const batchDlLoading = ref(false);
const batchDlError = ref('');

// ---- 图片下载者 ----
const imageDownloaders = reactive({});
const imageDlLoading = reactive({});

// ---- 用户下载明细 ----
const expandedUser = ref(null);
const userDownloads = reactive({});
const userDownloadsLoading = reactive({});
const userDownloadsError = reactive({});


async function fetchStats() {
  try {
    const data = await apiFetch('/api/admin/stats');
    stats.total_users = data.total_users || 0;
    stats.total_unlocks = data.total_unlocks || 0;
    stats.total_downloads = data.total_downloads || 0;
  } catch { /* ignore */ }
}

// ---- 批次列表 ----
const batches = ref([]);
const batchLoading = ref(false);
const batchError = ref('');
const expandedBatch = ref(null);
const activityCache = reactive({});
const activityLoading = reactive({});
const activityError = reactive({});

async function fetchBatches() {
  batchLoading.value = true;
  batchError.value = '';
  try {
    const data = await apiFetch('/api/admin/batches');
    batches.value = data.batches || [];
  } catch (e) {
    batchError.value = e.message || '加载批次失败';
  } finally {
    batchLoading.value = false;
  }
}

async function toggleBatch(b) {
  const newVal = b.is_active ? 0 : 1;
  try {
    await apiFetch('/api/admin/batches/' + b.batch_id, { method: 'PATCH', body: JSON.stringify({ is_active: newVal }) });
    b.is_active = newVal;
  } catch (e) {
    batchError.value = e.message;
  }
}

function selectForUpload(b) {
  uploadBatchId.value = b.batch_id;
  uploadBatchName.value = b.batch_name;
  view.value = 'upload';
}

function openImagesView(b) {
  imagesBatchId.value = b.batch_id;
  imagesBatchName.value = b.batch_name;
  imagesGroupFilter.value = '';
  imagesPage.value = 1;
  imagesSelected.value.clear();
  view.value = 'images';
  fetchImages();
  fetchImageGroups();
}

async function toggleExpandBatch(b) {
  if (expandedBatch.value === b.batch_id) {
    expandedBatch.value = null;
    return;
  }
  expandedBatch.value = b.batch_id;
  if (activityCache[b.batch_id]) return;
  activityLoading[b.batch_id] = true;
  activityError[b.batch_id] = '';
  try {
    const data = await apiFetch('/api/admin/batches/' + b.batch_id + '/activity');
    activityCache[b.batch_id] = data;
  } catch (e) {
    activityError[b.batch_id] = e.message || '加载活动记录失败';
  } finally {
    activityLoading[b.batch_id] = false;
  }
}

// ======= 图片管理 =======
const imagesBatchId = ref('');
const imagesBatchName = ref('');
const imagesData = ref([]);
const imagesTotal = ref(0);
const imagesTotalAll = ref(0);
const showNewGroupInput = ref(false);
const newGroupName = ref('');
const imagesPage = ref(1);
const imagesGroupFilter = ref('');
const imagesSelected = ref(new Set());
const imagesLoading = ref(false);
const imagesError = ref('');
const imageGroups = ref([]);

async function createGroup() {
  const name = newGroupName.value.trim();
  if (!name || !imagesBatchId.value) return;
  try {
    await apiFetch('/api/admin/groups', { method: 'POST', body: JSON.stringify({ batch_id: imagesBatchId.value, title: name }) });
    newGroupName.value = '';
    showNewGroupInput.value = false;
    fetchImageGroups();
  } catch (e) {
    uploadError.value = e.message || '创建分组失败';
  }
}

async function fetchImageGroups() {
  try {
    const data = await apiFetch('/api/admin/groups');
    const all = (data.groups || []).filter(g => g.batch_id === imagesBatchId.value);
    imageGroups.value = all;
  } catch {}
}

async function fetchImages() {
  if (!imagesBatchId.value) return;
  imagesLoading.value = true;
  imagesError.value = '';
  try {
    const params = new URLSearchParams();
    params.set('limit', '50');
    params.set('offset', String((imagesPage.value - 1) * 50));
    if (imagesGroupFilter.value) params.set('group_id', imagesGroupFilter.value);
    const data = await apiFetch('/api/admin/batches/' + imagesBatchId.value + '/images?' + params);
    imagesData.value = data.images || [];
    imagesTotal.value = data.total || 0;
  } catch (e) {
    imagesError.value = e.message || '加载图片失败';
  } finally {
    imagesLoading.value = false;
  }
}

function confirmDeleteImage(img) { deleteImageTarget.value = img; deleteImageError.value = ''; }

async function doDeleteImage() {
  if (!deleteImageTarget.value) return;
  deletingImage.value = true;
  deleteImageError.value = '';
  try {
    const imageId = encodeURIComponent(deleteImageTarget.value.image_id);
    const batchId = encodeURIComponent(imagesBatchId.value);
    try {
      await apiFetch('/api/admin/images/' + imageId + '?batch_id=' + batchId, { method: 'DELETE', silent: true });
    } catch (e) {
      // A stale list can point at an image already removed from D1; refresh it as success.
      if (e.status !== 404) throw e;
    }
    deleteImageTarget.value = null;
    await fetchImages();
    imagesSelected.value.clear();
  } catch (e) {
    deleteImageError.value = e.message || '删除失败';
  } finally {
    deletingImage.value = false;
  }
}

// ---- 移动图片 ----
const moveImageTarget = ref(null);
const moveImageToGroupId = ref('');
const movingImage = ref(false);
const moveImageError = ref('');

function startMoveImage(img) { moveImageTarget.value = img; moveImageToGroupId.value = img.group_id || ''; moveImageError.value = ''; }

async function doMoveImage() {
  if (!moveImageTarget.value || !moveImageToGroupId.value) return;
  movingImage.value = true;
  moveImageError.value = '';
  try {
    await apiFetch('/api/admin/images/' + moveImageTarget.value.image_id, {
      method: 'PATCH', body: JSON.stringify({ group_id: moveImageToGroupId.value }),
    });
    moveImageTarget.value = null;
    await fetchImages();
  } catch (e) {
    moveImageError.value = e.message || '移动失败';
  } finally {
    movingImage.value = false;
  }
}

// ---- 压缩图片 ----
const compressTarget = ref(null);
const compressing = ref(false);
const compressError = ref('');
const compressProgress = ref('');
const compressPct = ref(0);

// ---- 删除图片 ----
const deleteImageTarget = ref(null);
const deletingImage = ref(false);
const deleteImageError = ref('');

function startCompressImage(img) { compressTarget.value = img; compressError.value = ''; }

async function compressOneImage(imageId) {
  const dlResp = await apiFetch('/api/download', {
    method: 'POST',
    body: JSON.stringify({ image_id: imageId, asset: 'image' }),
  });
  if (!dlResp.url) throw new Error('获取下载链接失败');
  const res = await fetch(dlResp.url);
  if (!res.ok) throw new Error('下载原图失败');
  const blob = await res.blob();
  const jpeg = await compressToJpeg(blob);
  if (!jpeg) throw new Error('压缩失败');
  const signResp = await apiFetch('/api/admin/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ batch_id: imagesBatchId.value, files: [{ image_id: imageId, kind: 'original', content_type: 'image/jpeg' }] }),
  });
  const slot = signResp.uploads?.[0];
  if (!slot?.url) throw new Error('签名失败');
  const putRes = await fetch(slot.url, { method: 'PUT', body: jpeg.blob, headers: { 'Content-Type': 'image/jpeg' }, credentials: 'omit' });
  if (!putRes.ok) throw new Error('上传 JPEG 失败');
  await apiFetch('/api/admin/images/' + imageId, {
    method: 'PATCH',
    body: JSON.stringify({ r2_key: slot.key, preview_r2_key: slot.key, width: jpeg.width, height: jpeg.height }),
  });
}

async function doCompressImage() {
  if (!compressTarget.value) return;
  compressing.value = true;
  compressError.value = '';
  try {
    await compressOneImage(compressTarget.value.image_id);
    compressTarget.value = null;
    await fetchImages();
  } catch (e) {
    compressError.value = e.message || '压缩失败';
  } finally {
    compressing.value = false;
  }
}

// ---- 批量操作 ----
const batchMoveDialog = ref(false);
const batchCompressDialog = ref(false);
const batchDeleteDialog = ref(false);

function batchMoveImages() { moveImageToGroupId.value = ''; moveImageError.value = ''; batchMoveDialog.value = true; }

async function doBatchMove() {
  if (!moveImageToGroupId.value) return;
  movingImage.value = true;
  moveImageError.value = '';
  try {
    for (const id of imagesSelected.value) {
      await apiFetch('/api/admin/images/' + id, { method: 'PATCH', body: JSON.stringify({ group_id: moveImageToGroupId.value }) });
    }
    batchMoveDialog.value = false;
    imagesSelected.value.clear();
    await fetchImages();
  } catch (e) {
    moveImageError.value = e.message || '批量移动失败';
  } finally {
    movingImage.value = false;
  }
}

function batchCompressImages() { compressError.value = ''; compressProgress.value = ''; compressPct.value = 0; batchCompressDialog.value = true; }

async function doBatchCompress() {
  compressing.value = true;
  compressError.value = '';
  const ids = [...imagesSelected.value];
  let done = 0;
  compressProgress.value = '0 / ' + ids.length;
  try {
    for (const id of ids) {
      await compressOneImage(id);
      done++;
      compressProgress.value = done + ' / ' + ids.length;
      compressPct.value = Math.round((done / ids.length) * 100);
    }
    batchCompressDialog.value = false;
    imagesSelected.value.clear();
    await fetchImages();
  } catch (e) {
    compressError.value = e.message || '批量压缩失败';
  } finally {
    compressing.value = false;
  }
}

function batchDeleteImages() { deleteImageError.value = ''; batchDeleteDialog.value = true; }

async function doBatchDelete() {
  deletingImage.value = true;
  deleteImageError.value = '';
  try {
    for (const id of imagesSelected.value) {
      try {
        await apiFetch('/api/admin/images/' + encodeURIComponent(id) + '?batch_id=' + encodeURIComponent(imagesBatchId.value), { method: 'DELETE', silent: true });
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    }
    batchDeleteDialog.value = false;
    imagesSelected.value.clear();
    await fetchImages();
  } catch (e) {
    deleteImageError.value = e.message || '批量删除失败';
  } finally {
    deletingImage.value = false;
  }
}

// ---- 删除批次 ----
const deleteTarget = ref(null);
const deleting = ref(false);
const deleteError = ref('');

function confirmDeleteBatch(b) {
  deleteTarget.value = b;
  deleteError.value = '';
}

async function doDeleteBatch() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await apiFetch('/api/admin/batches/' + deleteTarget.value.batch_id, { method: 'DELETE' });
    batches.value = batches.value.filter((x) => x.batch_id !== deleteTarget.value.batch_id);
    deleteTarget.value = null;
    expandedBatch.value = null;
    await fetchStats();
  } catch (e) {
    deleteError.value = e.message || '删除失败';
  } finally {
    deleting.value = false;
  }
}

// ---- 批次设置 ---- 
const settingsTarget = ref(null);
const settingsImages = ref([]);
const settingsLoading = ref(false);
const settingsCoverId = ref(null);
const settingsNotes = ref('');
const settingsSaving = ref(false);
const settingsError = ref('');

async function openSettings(b) {
  settingsTarget.value = b;
  settingsCoverId.value = b.cover_image_id || null;
  settingsNotes.value = b.notes || '';
  settingsImages.value = [];
  settingsError.value = '';
  // Load batch images for cover picker
  settingsLoading.value = true;
  try {
    const data = await apiFetch('/api/admin/batches/' + b.batch_id + '/images?limit=200');
    settingsImages.value = (data.images || []).map((img) => ({
      ...img,
      preview_url: '/api/admin/preview/' + encodeURIComponent(img.image_id) + '?batch_id=' + encodeURIComponent(b.batch_id),
    }));
  } catch (e) {
    settingsError.value = e.message || '加载图片失败';
  } finally {
    settingsLoading.value = false;
  }
}

function closeSettings() {
  settingsTarget.value = null;
  settingsCoverId.value = null;
  settingsNotes.value = '';
  settingsImages.value = [];
}

async function saveSettings() {
  if (!settingsTarget.value) return;
  settingsSaving.value = true;
  settingsError.value = '';
  try {
    const body = {};
    if (settingsCoverId.value !== null) body.cover_image_id = settingsCoverId.value || '';
    if (settingsNotes.value !== null) body.notes = settingsNotes.value;
    await apiFetch('/api/admin/batches/' + settingsTarget.value.batch_id, { method: 'PATCH', body: JSON.stringify(body) });
    // Update local state
    const idx = batches.value.findIndex((x) => x.batch_id === settingsTarget.value.batch_id);
    if (idx !== -1) {
      if (settingsCoverId.value !== null) batches.value[idx].cover_image_id = settingsCoverId.value;
      if (settingsNotes.value !== null) batches.value[idx].notes = settingsNotes.value;
    }
    closeSettings();
  } catch (e) {
    settingsError.value = e.message || '保存失败';
  } finally {
    settingsSaving.value = false;
  }
}

// ---- 公告管理 ----
const allAnnouncements = ref([]);
const editingAnnouncement = ref(false);
const announceForm = ref({ id: null, title: '', content: '', image_url: '' });
const announceSaving = ref(false);
const announceError = ref('');

async function openAnnouncements() {
  view.value = 'announcements';
  await fetchAllAnnouncements();
  await fetchPledgeText();
}

async function fetchAllAnnouncements() {
  try {
    const data = await apiFetch('/api/admin/announcements');
    allAnnouncements.value = data.announcements || [];
  } catch { /* ignore */ }
}

function newAnnouncement() {
  announceForm.value = { id: null, title: '', content: '', image_url: '' };
  editingAnnouncement.value = true;
  announceError.value = '';
}

function editAnnouncement(a) {
  announceForm.value = { id: a.id, title: a.title, content: a.content, image_url: a.image_url || '' };
  editingAnnouncement.value = true;
  announceError.value = '';
}

function cancelEditAnnouncement() {
  editingAnnouncement.value = false;
  announceForm.value = { id: null, title: '', content: '', image_url: '' };
}

async function saveAnnouncement() {
  announceSaving.value = true;
  announceError.value = '';
  try {
    const body = { title: announceForm.value.title, content: announceForm.value.content };
    if (announceForm.value.image_url) body.image_url = announceForm.value.image_url.trim();

    if (announceForm.value.id) {
      await apiFetch('/api/admin/announcements/' + announceForm.value.id, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await apiFetch('/api/admin/announcements', { method: 'POST', body: JSON.stringify(body) });
    }
    cancelEditAnnouncement();
    await fetchAllAnnouncements();
  } catch (e) {
    announceError.value = e.message || '保存失败';
  } finally {
    announceSaving.value = false;
  }
}

async function toggleAnnouncement(a) {
  try {
    const newVal = a.is_active ? 0 : 1;
    await apiFetch('/api/admin/announcements/' + a.id, { method: 'PATCH', body: JSON.stringify({ is_active: newVal }) });
    a.is_active = newVal;
  } catch (e) {
    announceError.value = e.message;
  }
}

async function moveAnnouncement(a, delta) {
  const newOrder = a.sort_order + delta;
  const other = allAnnouncements.value.find((x) => x.sort_order === newOrder);
  try {
    await apiFetch('/api/admin/announcements/' + a.id, { method: 'PATCH', body: JSON.stringify({ sort_order: newOrder }) });
    a.sort_order = newOrder;
    if (other) {
      await apiFetch('/api/admin/announcements/' + other.id, { method: 'PATCH', body: JSON.stringify({ sort_order: a.sort_order - delta }) });
      other.sort_order = a.sort_order - delta;
    }
  } catch (e) {
    announceError.value = e.message;
  }
}

async function deleteAnnouncement(a) {
  if (!confirm('确定要删除公告「' + a.title + '」吗？')) return;
  try {
    await apiFetch('/api/admin/announcements/' + a.id, { method: 'DELETE' });
    allAnnouncements.value = allAnnouncements.value.filter((x) => x.id !== a.id);
  } catch (e) {
    announceError.value = e.message;
  }
}

// ---- 宣誓文本 ----
const pledgeTextAdmin = ref('');
const pledgeSaving = ref(false);

async function fetchPledgeText() {
  try {
    const data = await apiFetch('/api/admin/site-config');
    pledgeTextAdmin.value = data.pledge_text || '';
  } catch { /* ignore */ }
}

async function savePledgeText() {
  pledgeSaving.value = true;
  try {
    await apiFetch('/api/admin/site-config', {
      method: 'PUT',
      body: JSON.stringify({ key: 'pledge_text', value: pledgeTextAdmin.value }),
    });
  } catch (e) {
    announceError.value = e.message;
  } finally {
    pledgeSaving.value = false;
  }
}


// ---- 反馈查看 ----
const feedbacks = ref([]);
const feedbackLoading = ref(false);
const feedbackTotal = ref(0);

async function fetchFeedbacks(offset = 0) {
  feedbackLoading.value = true;
  try {
    const data = await apiFetch('/api/admin/feedbacks?offset=' + offset + '&limit=20');
    if (offset === 0) feedbacks.value = data.feedbacks || [];
    else feedbacks.value.push(...(data.feedbacks || []));
    feedbackTotal.value = data.total || 0;
  } catch (e) {
    /* ignore */
  } finally {
    feedbackLoading.value = false;
  }
}

async function openFeedbacks() {
  view.value = 'feedbacks';
  feedbacks.value = [];
  await fetchFeedbacks(0);
}

async function deleteFeedback(f) {
  if (!confirm('确定要删除这条反馈吗？')) return;
  try {
    await apiFetch('/api/admin/feedbacks/' + f.id, { method: 'DELETE' });
    feedbacks.value = feedbacks.value.filter(x => x.id !== f.id);
    feedbackTotal.value = Math.max(0, feedbackTotal.value - 1);
  } catch (e) {
    /* ignore */
  }
}


// ---- 过滤词 ----
function addFilterWord() {
  const w = newFilterWord.value.trim();
  if (!w || filterWords.value.includes(w)) { newFilterWord.value = ""; return; }
  filterWords.value.push(w);
  newFilterWord.value = "";
}

async function doSaveFilterWords() {
  filterSaving.value = true;
  try {
    await saveFilterWords([...filterWords.value]);
  } catch (e) {
    /* ignore */
  } finally {
    filterSaving.value = false;
  }
}

async function fetchFilterWords() {
  try {
    const data = await apiFetch("/api/admin/filter-words");
    filterWords.value = data.words || [];
  } catch { filterWords.value = []; }
}

async function saveFilterWords(newWords) {
  await apiFetch("/api/admin/filter-words", {
    method: "POST",
    body: JSON.stringify({ words: newWords }),
  });
  filterWords.value = newWords;
}

function openFilterWords() {
  view.value = "filter-words";
  fetchFilterWords();
}

// ---- 新建批次 ----
const createForm = ref({ batch_name: '', batch_id: '', expire_at: '' });
const creating = ref(false);
const createError = ref('');
const createdPassword = ref('');
const createdBatchId = ref('');

async function createBatch() {
  creating.value = true;
  createError.value = '';
  createdPassword.value = '';
  try {
    const body = { batch_name: createForm.value.batch_name };
    if (createForm.value.batch_id.trim()) body.batch_id = createForm.value.batch_id.trim();
    if (createForm.value.expire_at) body.expire_at = new Date(createForm.value.expire_at).toISOString();
    const data = await apiFetch('/api/admin/batches', { method: 'POST', body: JSON.stringify(body) });
    createdBatchId.value = data.batch_id;
    batches.value.unshift({ batch_id: data.batch_id, batch_name: data.batch_name, is_active: 0, image_count: 0, group_count: 0, unlock_count: 0, download_count: 0, created_at: new Date().toISOString(), expire_at: body.expire_at || null });
    createdPassword.value = data.password;
  } catch (e) {
    createError.value = e.message || '创建失败';
  } finally {
    creating.value = false;
  }
}

async function copyPassword() {
  if (createdPassword.value) await navigator.clipboard.writeText(createdPassword.value).catch(() => {});
}

function goUploadCreated() {
  uploadBatchId.value = createdBatchId.value;
  const b = batches.value.find((x) => x.batch_id === createdBatchId.value);
  uploadBatchName.value = b?.batch_name || '';
  createdPassword.value = '';
  view.value = 'upload';
}

// ---- 上传 ----
const uploadFormat = ref('png');
const uploadBatchId = ref('');
const uploadBatchName = ref('');
const entries = ref([]);
const groups = ref([]);
const parsing = ref(false);
const dragging = ref(false);
const expandedId = ref(null);
const uploading = ref(false);
const uploadError = ref('');
const uploadResult = ref(null);
const phase = ref('');
const done = ref(0);
const total = ref(0);

const entryById = (id) => entries.value.find((e) => e.id === id);
const totalFiles = computed(() => {
  let c = 0;
  for (const e of entries.value) { c++; if (e.thumbBlob) c++; if (e.txtFile) c++; }
  return c;
});

function backToList() {
  view.value = 'list';
  fetchBatches();
  fetchStats();
}

function resetFile(e) {
  e.target.value = null;
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  parsing.value = true;
  uploadError.value = '';
  uploadResult.value = null;
  try {
    const plan = await buildUploadPlan(files, filterWords.value);
    entries.value = plan.entries;
    groups.value = plan.groups;
    plan.entries.forEach((e) => makeThumbnail(e).catch(() => null));
  } catch (e) {
    uploadError.value = e.message || '解析失败';
  } finally {
    parsing.value = false;
  }
}

function onFileSelect(e) {
  handleFiles(e.target.files);
}

function onDrop(e) {
  dragging.value = false;
  handleFiles(e.dataTransfer?.files);
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function addGroup() {
  groups.value.push({
    id: 'grp-' + crypto.randomUUID(),
    groupKey: 'manual-' + crypto.randomUUID(),
    positive_prompt: '',
    negative_prompt: '',
    title: '分组 ' + (groups.value.length + 1),
    notes: '',
    imageIds: [],
  });
}

function moveImg(id, newGroupId) {
  moveEntryToGroup(entries.value, id, newGroupId);
  rebuildGroupImageIds();
}

function rebuildGroupImageIds() {
  for (const g of groups.value) g.imageIds = entries.value.filter((e) => e.groupId === g.id).map((e) => e.id);
}

function deleteGroup(g) {
  if (g.id === '__ungrouped__') return;
  for (const id of g.imageIds) {
    moveEntryToGroup(entries.value, id, '__ungrouped__');
  }
  let ungrouped = groups.value.find((x) => x.id === '__ungrouped__');
  if (!ungrouped) {
    ungrouped = { id: '__ungrouped__', groupKey: '__ungrouped__', positive_prompt: '', negative_prompt: '', title: '未分组', imageIds: [] };
    groups.value.unshift(ungrouped);
  }
  groups.value = groups.value.filter((x) => x.id !== g.id);
  rebuildGroupImageIds();
}

function onProgress(d, t, ph) {
  done.value = d;
  total.value = t;
  phase.value = ph;
}

const phaseLabel = computed(() => ({
  sign: '正在获取上传地址...',
  put: '正在上传到 R2（' + done.value + '/' + total.value + '）',
  complete: '正在提交清单...',
  limit: '检查文件数...',
}[phase.value] || '处理中...'));

const pct = computed(() => {
  if (phase.value === 'put' && total.value) return Math.round((done.value / total.value) * 100);
  if (phase.value === 'complete') return 100;
  return phase.value ? 10 : 0;
});

async function submitUpload() {
  if (totalFiles.value > SIGN_FILE_LIMIT) {
    uploadError.value = '文件数 (' + totalFiles.value + ') 超过单批上限 ' + SIGN_FILE_LIMIT;
    return;
  }
  uploading.value = true;
  uploadError.value = '';
  uploadResult.value = null;
  phase.value = 'limit';
  try {
    const result = await uploadBatch(uploadBatchId.value, entries.value, groups.value, onProgress, uploadFormat.value);
    uploadResult.value = result;
    entries.value = [];
    groups.value = [];
    expandedId.value = null;
    await backToList();
  } catch (e) {
    uploadError.value = e.message || '上传失败';
  } finally {
    uploading.value = false;
    phase.value = '';
  }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

onMounted(() => {
  fetchStats();
  fetchBatches();
  document.addEventListener('click', onDocClick);
});
// Click-outside handler for more menu

// ---- 批次下载详情视图 ----
function openBatchDownloads(b) {
  batchDownloadsId.value = b.batch_id;
  batchDownloadsName.value = b.batch_name;
  batchDownloadsData.value = [];
  batchDlError.value = '';
  view.value = 'batch-downloads';
  fetchBatchDownloads();
}

async function fetchBatchDownloads() {
  batchDlLoading.value = true;
  batchDlError.value = '';
  try {
    const data = await apiFetch('/api/admin/downloads?batch=' + encodeURIComponent(batchDownloadsId.value) + '&limit=200');
    batchDownloadsData.value = data.downloads || [];
  } catch (e) {
    batchDlError.value = e.message || '加载下载记录失败';
  } finally {
    batchDlLoading.value = false;
  }
}

// ---- 图片下载者明细 ----
async function toggleImageDownloaders(img) {
  const key = img.image_id;
  if (imageDownloaders[key]) {
    delete imageDownloaders[key];
    return;
  }
  imageDlLoading[key] = true;
  try {
    const data = await apiFetch('/api/admin/images/' + encodeURIComponent(img.image_id) + '/downloads');
    imageDownloaders[key] = data.downloads || [];
  } catch (e) {
    imageDownloaders[key] = [];
  } finally {
    imageDlLoading[key] = false;
  }
}

// ---- 用户下载明细展开 ----
async function toggleUserDownloads(u) {
  const key = u.discord_id;
  if (expandedUser.value === key) {
    expandedUser.value = null;
    return;
  }
  expandedUser.value = key;
  if (userDownloads[key]) return;
  userDownloadsLoading[key] = true;
  userDownloadsError[key] = '';
  try {
    const data = await apiFetch('/api/admin/users/' + encodeURIComponent(key) + '/downloads');
    userDownloads[key] = data.batches || [];
  } catch (e) {
    userDownloads[key] = [];
    userDownloadsError[key] = e.message || '加载下载明细失败';
  } finally {
    userDownloadsLoading[key] = false;
  }
}

function onDocClick(e) {
  const moreBtn = document.querySelector('.btn-more');
  const dropdown = document.querySelector('.more-dropdown');
  if (moreBtn && !moreBtn.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
    showMoreMenu.value = false;
  }
}

// ---- 用户管理 ----
function openUsers() { view.value = 'users'; fetchUsers(); fetchGuildAccess(); }
async function fetchUsers() {
  usersLoading.value = true;
  usersError.value = '';
  try {
    const data = await apiFetch('/api/admin/users');
    users.value = data.users || [];
    blacklist.value = data.blacklist || [];
    whitelist.value = data.whitelist || [];
  } catch (e) {
    users.value = [];
    usersError.value = e.message || '用户列表加载失败';
  } finally {
    usersLoading.value = false;
  }
}
async function fetchGuildAccess() {
  guildError.value = '';
  try {
    const data = await apiFetch('/api/admin/guild-access');
    guildAccess.whitelist = data.whitelist || [];
    guildAccess.blacklist = data.blacklist || [];
  } catch (e) {
    guildAccess.whitelist = [];
    guildAccess.blacklist = [];
    guildError.value = e.message || '服务器名单加载失败';
  }
}
async function addBlockedUser() {
  blacklistSaving.value = true;
  blacklistError.value = '';
  blacklistSuccess.value = '';
  const rawIds = String(blacklistForm.value.rawIds || '').trim();
  const discordIds = [...new Set(rawIds.split(/[\s,，;；]+/).map(s => s.trim()).filter(Boolean))];
  if (!discordIds.length) {
    blacklistError.value = '请输入至少一个 Discord 用户 ID';
    blacklistSaving.value = false;
    return;
  }
  const invalid = discordIds.filter(id => !/^\d{17,20}$/.test(id));
  if (invalid.length) {
    blacklistError.value = `以下不是有效的 Discord ID：${invalid.join('、')}`;
    blacklistSaving.value = false;
    return;
  }
  try {
    const data = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ discord_ids: discordIds, note: blacklistForm.value.note || '' }),
    });
    blacklistForm.value = { rawIds: '', note: '' };
    await fetchUsers();
    blacklistSuccess.value = `已拉黑 ${data?.blacklisted ?? discordIds.length} 个用户`;
  } catch (e) {
    blacklistError.value = e.message || '加入黑名单失败';
  } finally {
    blacklistSaving.value = false;
  }
}
async function blockUser(discordId) {
  if (!confirm('确定要拉黑这个用户吗？拉黑后将无法登录和访问网站。')) return;
  blacklistForm.value = { rawIds: discordId, note: '' };
  await addBlockedUser();
}
async function unblockUser(discordId) {
  if (!confirm('确定解除拉黑吗？')) return;
  blacklistSuccess.value = '';
  try {
    await apiFetch('/api/admin/users?discord_id=' + encodeURIComponent(discordId), { method: 'DELETE' });
    await fetchUsers();
  } catch (e) {
    blacklistError.value = e.message || '解除拉黑失败';
  }
}
async function addWhitelistedUser() {
  whitelistSaving.value = true;
  whitelistError.value = '';
  whitelistSuccess.value = '';
  const rawIds = String(whitelistForm.value.rawIds || '').trim();
  const discordIds = [...new Set(rawIds.split(/[\s,，;；]+/).map(s => s.trim()).filter(Boolean))];
  if (!discordIds.length) {
    whitelistError.value = '请输入至少一个 Discord 用户 ID';
    whitelistSaving.value = false;
    return;
  }
  const invalid = discordIds.filter(id => !/^\d{17,20}$/.test(id));
  if (invalid.length) {
    whitelistError.value = `以下不是有效的 Discord ID：${invalid.join('、')}`;
    whitelistSaving.value = false;
    return;
  }
  try {
    const data = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ list: 'whitelist', discord_ids: discordIds, note: whitelistForm.value.note || '' }),
    });
    whitelistForm.value = { rawIds: '', note: '' };
    await fetchUsers();
    whitelistSuccess.value = `已加入 ${data?.whitelisted ?? discordIds.length} 个用户`;
  } catch (e) {
    whitelistError.value = e.message || '加入白名单失败';
  } finally {
    whitelistSaving.value = false;
  }
}
async function whitelistUser(discordId) {
  if (!confirm('确定将该用户加入个人白名单吗？他将免除服务器/身份组黑名单的拦截。')) return;
  whitelistForm.value = { rawIds: discordId, note: '' };
  await addWhitelistedUser();
}
async function unwhitelistUser(discordId) {
  if (!confirm('确定将该用户移出个人白名单吗？')) return;
  whitelistSuccess.value = '';
  try {
    await apiFetch('/api/admin/users?list=whitelist&discord_id=' + encodeURIComponent(discordId), { method: 'DELETE' });
    await fetchUsers();
  } catch (e) {
    whitelistError.value = e.message || '移除白名单失败';
  }
}
async function promoteUser(discordId) {
  if (!confirm('确定将该用户提升为管理员？')) return;
  try {
    await apiFetch('/api/admin/users/' + discordId, { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
    const u = users.value.find(x => x.discord_id === discordId);
    if (u) u.role = 'admin';
  } catch (e) { /* toast handled by apiFetch */ }
}
async function demoteUser(discordId) {
  if (!confirm('确定将该用户降级为普通用户？')) return;
  try {
    await apiFetch('/api/admin/users/' + discordId, { method: 'PATCH', body: JSON.stringify({ role: 'user' }) });
    const u = users.value.find(x => x.discord_id === discordId);
    if (u) u.role = 'user';
  } catch (e) { /* toast handled by apiFetch */ }
}

// ---- 服务器白名单 / 黑名单 ----
async function resolveGuildInvite() {
  const value = guildInvite.value.trim();
  if (!value) {
    guildError.value = '请输入邀请链接、邀请码或服务器 ID';
    return;
  }
  guildResolving.value = true;
  guildError.value = '';
  guildResolveResult.value = null;
  guildNameOverride.value = '';
  guildRoleId.value = '';
  guildRoleName.value = '';
  try {
    const data = await apiFetch('/api/admin/guild-access', {
      method: 'POST',
      body: JSON.stringify({ invite: value }),
    });
    guildResolveResult.value = data;
    guildNameOverride.value = data?.guild_name || '';
  } catch (e) {
    guildResolveResult.value = null;
    guildNameOverride.value = '';
    guildError.value = e.message || '解析失败';
  } finally {
    guildResolving.value = false;
  }
}

async function addGuildToList(listType) {
  const item = guildResolveResult.value;
  if (!item?.guild_id) return;
  const roleId = guildRoleId.value.trim();
  if (roleId && !/^\d{17,20}$/.test(roleId)) {
    guildError.value = '身份组 ID 格式不正确，应为 17-20 位数字';
    return;
  }
  const target = guildAccess[listType];
  const key = roleId ? `${item.guild_id}:${roleId}` : item.guild_id;
  if (!target.some(g => `${g.guild_id}:${g.role_id || ''}` === key)) {
    target.push({
      guild_id: item.guild_id,
      guild_name: guildNameOverride.value.trim() || item.guild_name || '',
      role_id: roleId || null,
      role_name: roleId ? guildRoleName.value.trim() : '',
      member_count: item.member_count ?? null,
      added_at: new Date().toISOString(),
    });
  }
  guildResolveResult.value = null;
  guildInvite.value = '';
  guildNameOverride.value = '';
  guildRoleId.value = '';
  guildRoleName.value = '';
  await saveGuildAccess();
}

async function removeGuildFromList(listType, guildId, roleId = '') {
  guildAccess[listType] = guildAccess[listType].filter(g => !(g.guild_id === guildId && (g.role_id || '') === roleId));
  await saveGuildAccess();
}

async function saveGuildAccess() {
  guildSaving.value = true;
  guildError.value = '';
  try {
    const data = await apiFetch('/api/admin/guild-access', {
      method: 'PUT',
      body: JSON.stringify({
        whitelist: guildAccess.whitelist,
        blacklist: guildAccess.blacklist,
      }),
    });
    guildAccess.whitelist = data.whitelist || [];
    guildAccess.blacklist = data.blacklist || [];
  } catch (e) {
    guildError.value = e.message || '服务器名单保存失败';
  } finally {
    guildSaving.value = false;
  }
}

// ---- 下载记录 ----
function openDownloads() { view.value = 'downloads'; downloads.value = []; dlTotal.value = 0; fetchDownloads(0); }
async function fetchDownloads(offset = 0) {
  dlLoading.value = true;
  if (offset === 0) downloadsError.value = '';
  try {
    let url = '/api/admin/downloads?limit=50&offset=' + offset;
    if (dlUserFilter.value) url += '&user=' + encodeURIComponent(dlUserFilter.value);
    if (dlBatchFilter.value) url += '&batch=' + encodeURIComponent(dlBatchFilter.value);
    const data = await apiFetch(url);
    if (offset === 0) downloads.value = data.downloads || [];
    else downloads.value = [...downloads.value, ...(data.downloads || [])];
    dlTotal.value = data.total || downloads.value.length;
  } catch (e) {
    if (offset === 0) downloads.value = [];
    if (offset === 0) downloadsError.value = e.message || '下载记录加载失败';
  } finally {
    dlLoading.value = false;
  }
}
function debounceFetchDownloads() {
  clearTimeout(dlDebounceTimer);
  dlDebounceTimer = setTimeout(() => { downloads.value = []; dlTotal.value = 0; fetchDownloads(0); }, 400);
}

// ---- 登录记录 ----
function openLogins() {
  view.value = 'logins';
  logins.value = [];
  loginsTotal.value = 0;
  fetchLogins();
}
async function fetchLogins() {
  loginsLoading.value = true;
  loginsError.value = '';
  try {
    const data = await apiFetch('/api/admin/logins?limit=100');
    logins.value = data.logins || [];
    loginsTotal.value = data.total || logins.value.length;
  } catch (e) {
    logins.value = [];
    loginsError.value = e.message || '登录记录加载失败';
  } finally {
    loginsLoading.value = false;
  }
}
function loginReasonLabel(reason) {
  const labels = {
    personal_blacklist: '个人黑名单',
    guild_blacklist: '服务器黑名单',
    guild_whitelist: '未命中服务器白名单',
    guild_lookup_failed: '服务器信息获取失败',
    not_in_guild: '不在指定服务器',
    role_denied: '身份组不通过',
  };
  return labels[reason] || reason || '';
}

// ---- 重置密码 ----
async function resetBatchPassword(batchId) {
  const customPassword = window.prompt('请输入新密码（留空则自动生成随机密码）：');
  if (customPassword === null) return;
  if (customPassword.trim().length > 128) {
    settingsError.value = '密码不能超过 128 个字符';
    return;
  }
  if (!confirm('确定要设置新密码吗？旧密码将立即失效。')) return;
  resetPwdLoading.value = true;
  newPassword.value = '';
  try {
    const data = await apiFetch('/api/admin/batches/' + encodeURIComponent(batchId) + '/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: customPassword.trim() }),
    });
    newPassword.value = data.password;
  } catch (e) {
    /* toast handled by apiFetch */
  } finally {
    resetPwdLoading.value = false;
  }
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    /* brief visual feedback */
  }).catch(() => {});
}

</script>

<style scoped>
.admin-shell {
  max-width: 920px;
  margin: 0 auto;
  padding: 120px 24px 80px;
}

.back-btn {
  position: fixed; top: 40px; right: 40px; z-index: 160;
  background: var(--glass-bg); backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  cursor: pointer; padding: 8px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.3s;
}
.back-btn svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 1.5; fill: none; }
.back-btn:hover { background: var(--glass-border); }

.admin-header { margin-bottom: 24px; }
.admin-header h1 { font-size: 32px; font-weight: 300; letter-spacing: 4px; margin-bottom: 8px; }
.admin-header p { font-size: 14px; opacity: 0.6; letter-spacing: 1px; }

/* 统计仪表盘 */
.stats-dash {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;
}
.stat-card {
  background: var(--glass-bg); backdrop-filter: blur(8px);
  border: 1px solid var(--glass-border); border-radius: var(--radius);
  padding: 20px 16px; text-align: center;
}
.stat-num { display: block; font-size: 28px; font-weight: 300; letter-spacing: 2px; margin-bottom: 4px; }
.stat-label { font-size: 12px; opacity: 0.5; letter-spacing: 1px; }

.list-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.list-toolbar h2 { font-size: 18px; font-weight: 500; margin: 0; }

/* 手机端：更多下拉菜单 */
.toolbar-actions { display: none; align-items: center; gap: 8px; position: relative; }
.toolbar-desktop-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.btn-more {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 14px; border-radius: 18px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg); color: var(--text);
  cursor: pointer; font-size: 13px; letter-spacing: 1px;
  white-space: nowrap;
}
.btn-more:hover { background: var(--glass-border); }

.more-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px; border-radius: 12px;
  background: var(--glass-bg); backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  z-index: 100; min-width: 140px;
}
.more-dropdown .btn-outline { width: 100%; text-align: center; }


.admin-card {
  margin-bottom: 24px; padding: 24px;
  border-radius: var(--radius); border: 1px solid var(--glass-border);
  background: var(--glass-bg); backdrop-filter: blur(8px);
}
.admin-placeholder { font-size: 14px; opacity: 0.5; }

.status-error { color: var(--status-error); font-size: 14px; }
.status-empty { font-size: 14px; opacity: 0.5; letter-spacing: 1px; }
.status-ok { color: var(--secondary); font-size: 14px; }
.warn { font-size: 12px; opacity: 0.7; letter-spacing: 1px; }

.empty-state { text-align: center; padding: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.empty-state p { font-size: 14px; opacity: 0.5; letter-spacing: 2px; }

/* 批次列表 */
.batch-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.batch-row-wrap { border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: rgba(255,255,255,0.04); overflow: hidden; }
.batch-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
}
.batch-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.batch-name { font-weight: 500; }
.batch-meta { font-size: 12px; opacity: 0.6; }
.batch-date { font-size: 11px; opacity: 0.5; }
.batch-actions { display: flex; align-items: center; gap: 8px; }

/* 展开活动 */
.batch-activity { padding: 16px; border-top: 1px solid var(--glass-border); background: rgba(255,255,255,0.02); }
.activity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.activity-col h4 { font-size: 13px; font-weight: 500; opacity: 0.7; margin-bottom: 8px; letter-spacing: 1px; }
.activity-list { list-style: none; font-size: 12px; display: flex; flex-direction: column; gap: 6px; }
.activity-list li { display: flex; gap: 8px; align-items: center; }
.activity-time { opacity: 0.4; font-size: 11px; margin-left: auto; }
.no-data { font-size: 12px; opacity: 0.4; }

.toggle-wrap { position: relative; display: inline-flex; cursor: pointer; }
.toggle-wrap input { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track { width: 40px; height: 22px; border-radius: 12px; background: var(--glass-border); position: relative; transition: background 0.3s; }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--bg); transition: transform 0.3s; }
.toggle-wrap input:checked + .toggle-track { background: var(--secondary); }
.toggle-wrap input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }

.icon-btn.small { width: 32px; height: 32px; border-radius: 50%; }
.icon-btn.small svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 1.5; fill: none; }
.icon-btn { background: var(--glass-bg); border: 1px solid var(--glass-border); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.3s; color: var(--text); }
.icon-btn:hover { background: var(--glass-border); }
.icon-btn.danger:hover { background: rgba(192,57,43,0.2); border-color: #c0392b; color: #c0392b; }
.icon-btn.danger svg { stroke: currentColor; }

/* 新建表单 */
.create-form { display: flex; flex-direction: column; gap: 16px; max-width: 420px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.field input { padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: transparent; color: var(--text); }

.btn-primary {
  padding: 10px 24px; border-radius: 20px; border: 1px solid var(--glass-border);
  background: var(--secondary); color: #fff; cursor: pointer; font-size: 13px; letter-spacing: 1px;
  transition: opacity 0.3s;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline {
  padding: 8px 18px; border-radius: 18px; border: 1px solid var(--glass-border);
  background: var(--glass-bg); color: var(--text); cursor: pointer; font-size: 13px; letter-spacing: 1px;
  transition: background 0.3s;
}
.btn-outline:hover { background: var(--glass-border); }
.btn-danger {
  padding: 8px 18px; border-radius: 18px; border: 1px solid #c0392b;
  background: #c0392b; color: #fff; cursor: pointer; font-size: 13px; letter-spacing: 1px;
  transition: opacity 0.3s;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.password-reveal { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.password-code { font-family: monospace; font-size: 18px; padding: 12px 16px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); border: 1px dashed var(--glass-border); word-break: break-all; }
.password-actions { display: flex; gap: 10px; }

/* 上传 */
.upload-target { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; font-size: 14px; }
.upload-target strong { font-weight: 500; }

.file-drop {
  display: block; position: relative; padding: 28px; text-align: center;
  border: 2px dashed var(--glass-border); border-radius: var(--radius);
  cursor: pointer; transition: border-color 0.3s, background 0.3s; font-size: 14px; opacity: 0.8;
}
.file-drop.drag { border-color: var(--secondary); background: rgba(122,139,100,0.08); }
.file-drop input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.drop-hint { position: absolute; inset: 0; }

.preview-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.hint { font-size: 12px; opacity: 0.6; }

.group-block { margin-bottom: 20px; padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); }
.group-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.group-title-input { background: transparent; border: none; border-bottom: 1px solid transparent; font-size: 15px; font-weight: 500; padding: 2px 0; color: var(--text); }
.group-title-input:focus { border-bottom-color: var(--glass-border); outline: none; }
.group-count { font-size: 12px; opacity: 0.6; padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,0.05); }
.group-notes-input { background: transparent; border: 1px solid var(--glass-border); border-radius: 4px; font-size: 12px; padding: 3px 8px; color: var(--text); width: 140px; }
.group-notes-input:focus { outline: none; border-color: var(--secondary); }
.group-prompt { font-size: 12px; opacity: 0.5; margin-bottom: 10px; }

.thumb-row { display: flex; flex-wrap: wrap; gap: 10px; }
.thumb { position: relative; width: 110px; }
.thumb img { width: 100%; height: 130px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: block; }
.thumb-name { font-size: 10px; opacity: 0.6; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thumb-seed { font-size: 9px; opacity: 0.5; font-family: monospace; }
.thumb-txt { position: absolute; top: 4px; right: 4px; font-size: 9px; padding: 1px 5px; border-radius: 8px; background: var(--secondary); color: #fff; }
.thumb-move { width: 100%; font-size: 10px; padding: 2px; border-radius: 6px; border: 1px solid var(--glass-border); background: transparent; color: var(--text); margin-top: 2px; }
.thumb-expand { position: absolute; bottom: 4px; right: 4px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.4); color: #fff; border: none; cursor: pointer; font-size: 10px; line-height: 1; }

.prompt-detail { margin-top: 20px; padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: rgba(255,255,255,0.03); }
.prompt-detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 500; }
.prompt-detail h4 { font-size: 12px; opacity: 0.6; margin-top: 10px; margin-bottom: 4px; letter-spacing: 1px; }
.prompt-text { font-size: 13px; white-space: pre-wrap; word-break: break-word; }

.upload-progress { margin: 20px 0; }
.progress-bar { height: 6px; border-radius: 3px; background: var(--glass-border); overflow: hidden; margin-top: 8px; }
.progress-bar span { display: block; height: 100%; background: var(--secondary); transition: width 0.3s; }

/* 删除确认弹窗 */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  background: var(--glass-bg); backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border); border-radius: var(--radius);
  padding: 32px; max-width: 420px; width: 90%;
}
.modal-card h3 { font-size: 20px; font-weight: 500; margin-bottom: 16px; }
.modal-card p { font-size: 14px; opacity: 0.8; margin-bottom: 8px; }
.modal-warn { font-size: 12px !important; opacity: 0.6 !important; color: #c0392b; }
.modal-actions { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }

.settings-modal { max-width: 600px; }
.settings-modal .field { margin-bottom: 16px; }
.settings-textarea { width: 100%; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: transparent; color: var(--text); font-size: 13px; resize: vertical; font-family: inherit; }
.cover-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 320px; overflow-y: auto; }
.cover-thumb { cursor: pointer; border-radius: 8px; overflow: hidden; border: 2px solid transparent; transition: border-color 0.2s; }
.cover-thumb img { width: 100%; height: 120px; object-fit: cover; display: block; }
.cover-thumb.selected { border-color: var(--secondary); }
.cover-thumb:hover { border-color: var(--glass-border); }
/* ====== 图片管理视图 ====== */
.images-shell { padding: 24px 0 24px 24px; }
.images-layout { display: flex; gap: 24px; min-height: 400px; }
.images-sidebar { width: 180px; flex-shrink: 0; }
.images-sidebar h4 { font-size: 13px; opacity: 0.6; margin-bottom: 12px; letter-spacing: 1px; }
.group-tree { list-style: none; display: flex; flex-direction: column; gap: 4px; }
.group-tree li { padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: background 0.2s; }
.group-tree li:hover { background: rgba(255,255,255,0.05); }
.group-tree li.active { background: rgba(122,139,100,0.15); color: var(--secondary); }

.images-main { flex: 1; min-width: 0; padding-right: 24px; }

.images-batch-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin-bottom: 16px; border-radius: 10px; border: 1px solid var(--secondary); background: rgba(122,139,100,0.1); font-size: 13px; flex-wrap: wrap; }

.images-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.image-card { border-radius: var(--radius-sm); border: 1px solid var(--glass-border); overflow: hidden; background: rgba(255,255,255,0.03); transition: border-color 0.2s; position: relative; }
.image-card.selected { border-color: var(--secondary); }

.image-card-check { position: absolute; top: 6px; left: 6px; z-index: 2; cursor: pointer; }
.check-box { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.3); font-size: 12px; color: #fff; }
.image-card.selected .check-box { background: var(--secondary); border-color: var(--secondary); }

.image-card-img { width: 100%; height: 160px; object-fit: cover; display: block; }
.image-card-placeholder { width: 100%; height: 160px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); font-size: 12px; opacity: 0.4; }

.image-card-info { padding: 8px; }
.image-card-prompt { font-size: 11px; opacity: 0.8; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.image-card-meta { font-size: 10px; opacity: 0.5; display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.image-card-meta span + span::before { content: '·'; margin-right: 4px; }
.image-card-group { font-size: 10px; opacity: 0.5; font-style: italic; }
.image-card-actions { display: flex; gap: 4px; padding: 0 8px 8px; }

.images-pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
.images-pager button { padding: 6px 14px; border-radius: 14px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text); cursor: pointer; font-size: 13px; }
.images-pager button:disabled { opacity: 0.3; cursor: not-allowed; }

/* 上传格式选择 */
.upload-format-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.format-label { font-size: 13px; opacity: 0.7; }
.format-opt { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.format-opt input[type=radio] { accent-color: var(--secondary); }

/* tiny action buttons */
.btn-outline.tiny { padding: 4px 10px; font-size: 11px; border-radius: 12px; letter-spacing: 0; }
.btn-danger.tiny { padding: 4px 10px; font-size: 11px; border-radius: 12px; letter-spacing: 0; }

/* move select in modal */
.move-select { width: 100%; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: transparent; color: var(--text); font-size: 14px; margin: 12px 0; font-family: inherit; }

@media (max-width: 768px) {
  .stats-dash { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-num { font-size: 22px; }
  .activity-grid { grid-template-columns: 1fr; }
  .batch-row { flex-wrap: wrap; }
  .images-layout { flex-direction: column; }
  .images-sidebar { width: 100%; }
  .images-grid { grid-template-columns: repeat(2, 1fr); }
  .toolbar-actions { display: flex; }
  .toolbar-desktop-actions { display: none; }
}

/* 公告管理 */
.pledge-editor {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--glass-border);
}
.pledge-editor h3 { font-size: 16px; margin-bottom: 8px; }
.pledge-hint { font-size: 12px; opacity: 0.5; margin-bottom: 12px; }
/* 新建分组 */
.new-group-zone { margin-top: 12px; }
.new-group-form { display: flex; gap: 6px; align-items: center; }
.new-group-input { width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--glass-border); background: transparent; color: var(--text); font-size: 12px; }
.new-group-input:focus { outline: none; border-color: var(--secondary); }

.filter-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.filter-tag { display: inline-flex; align-items: center; gap: 6px; background: var(--glass-bg, rgba(255,255,255,0.06)); border: 1px solid var(--glass-border, rgba(255,255,255,0.12)); border-radius: 20px; padding: 4px 12px; font-size: 13px; color: var(--text-primary, #fff); }
.tag-remove { background: none; border: none; color: var(--text-secondary, rgba(255,255,255,0.5)); cursor: pointer; font-size: 16px; line-height: 1; padding: 0; margin-left: 2px; }
.tag-remove:hover { color: #ff6b6b; }


/* 批次下载详情图片行 */
.dl-img-row { display: flex; align-items: center; gap: 8px; }
.dl-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--glass-border); flex-shrink: 0; }
.dl-prompt { font-size: 11px; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

/* 图片卡片下载徽标 */
.image-card-dl {
  font-size: 10px; padding: 1px 6px; margin: 0 4px;
  border-radius: 6px; background: rgba(255,255,255,0.06); color: var(--text);
  opacity: 0.6;
  cursor: pointer; display: inline-block;
  transition: background 0.2s;
}
.image-card-dl:hover { background: rgba(255,255,255,0.12); opacity: 0.85; }

/* 图片卡片展开的下载者列表 */
.image-downloaders {
  padding: 6px 8px; border-top: 1px solid var(--glass-border);
  background: rgba(0,0,0,0.1);
}
.image-downloaders .activity-list { font-size: 11px; gap: 4px; }
.image-downloaders .activity-list li { gap: 6px; }
.image-downloaders .activity-time { font-size: 10px; }

/* 用户下载展开行 */
.user-downloads-row td { padding: 0 !important; border-bottom: 2px solid var(--glass-border); }
.inner-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.inner-table th { text-align: left; padding: 6px 12px; border-bottom: 1px solid var(--glass-border); opacity: 0.6; font-size: 11px; }
.inner-table td { padding: 6px 12px; border-bottom: 1px solid var(--glass-border); }

/* 展开箭头 */
.expand-arrow { transition: transform 0.2s; }
.expand-arrow.open { transform: rotate(90deg); }

/* 数据表格 (用户管理/下载记录) */
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--glass-border); opacity: 0.6; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--glass-border); vertical-align: middle; }
.data-table tr:hover td { background: rgba(255,255,255,0.03); }
.data-table small { font-size: 11px; opacity: 0.5; }

/* 角色标签 */
.role-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.role-badge.admin { background: rgba(192,57,43,0.2); color: #e74c3c; }
.role-badge.user { background: rgba(255,255,255,0.08); color: var(--text); opacity: 0.7; }
.login-marker { display: inline-block; padding: 2px 8px; border-radius: 10px; background: rgba(122,139,100,0.18); color: var(--secondary); font-size: 11px; font-weight: 600; }

/* 筛选行 */
.filter-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-input { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text); font-size: 12px; flex: 1; min-width: 160px; font-family: inherit; }
.filter-input:focus { outline: none; border-color: var(--secondary); }
.filter-input::placeholder { opacity: 0.4; }
.blacklist-form .blacklist-ids { flex: 1 1 100%; min-width: 100%; resize: vertical; line-height: 1.5; }
.whitelist-panel { margin-top: 32px; }

/* 新密码显示 */
.new-pwd-display { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--glass-bg); border-radius: 10px; border: 1px solid var(--glass-border); font-size: 13px; }
.new-pwd-display code { font-size: 15px; font-weight: bold; letter-spacing: 1px; color: var(--accent, #c6a76c); }

/* 小号按钮变体 */
.btn-outline.small { padding: 4px 12px; font-size: 12px; border-radius: 12px; }

/* 服务器白名单 / 黑名单 */
.guild-access-panel {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--glass-border);
}
.guild-access-panel h3 { font-size: 16px; margin-bottom: 8px; }
.guild-resolve-card {
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 10px;
  border: 1px solid var(--secondary);
  background: rgba(122,139,100,0.1);
}
.guild-resolve-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; }
.guild-id { font-family: monospace; font-size: 11px; opacity: 0.6; }
.guild-meta { font-size: 11px; opacity: 0.6; }
.guild-role-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.guild-resolve-actions { display: flex; gap: 8px; margin-top: 10px; }
.guild-list-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
.guild-list-col h4 { font-size: 13px; opacity: 0.7; margin-bottom: 8px; letter-spacing: 1px; }
@media (max-width: 768px) {
  .guild-list-row { grid-template-columns: 1fr; }
}
</style>
