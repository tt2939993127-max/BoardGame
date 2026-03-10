# Docker 构建优化说明

## 优化内容

### 1. BuildKit 缓存挂载（主要优化）

**原理**：使用 Docker BuildKit 的 `--mount=type=cache` 特性，在多次构建之间共享 npm 缓存目录。

**效果**：
- 首次构建：正常下载依赖（~70 秒）
- 后续构建（依赖未变）：跳过下载，直接使用缓存（~5 秒）
- 后续构建（依赖变化）：只下载变化的包（~20-30 秒）

**实现**：
```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

### 2. 禁用 SBOM 和 Provenance（次要优化）

**原理**：GitHub Actions 默认生成软件物料清单（SBOM）和来源证明（Provenance），会增加构建时间。

**效果**：减少 10-20 秒构建时间。

**实现**：
```yaml
provenance: false
sbom: false
```

### 3. npm 镜像源（可选）

**原理**：使用国内镜像源加速依赖下载（仅在国内环境有效）。

**使用方法**：取消 Dockerfile 中的注释
```dockerfile
RUN npm config set registry https://registry.npmmirror.com
```

**注意**：GitHub Actions 服务器在国外，使用镜像源可能反而变慢，因此默认注释。

## 预期效果

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 首次构建 | ~5 分钟 | ~4 分钟 |
| 依赖未变 | ~5 分钟 | ~2 分钟 |
| 依赖变化 | ~5 分钟 | ~3 分钟 |

## 验证方法

1. 提交代码触发构建
2. 查看 GitHub Actions 日志
3. 找到 `RUN npm ci` 步骤
4. 如果看到 `CACHED` 或时间显著减少，说明优化生效

## 注意事项

1. **BuildKit 缓存挂载是跨构建共享的**，不会影响镜像最终大小
2. **缓存目录不会打包进镜像**，只在构建时使用
3. **完全向后兼容**，不会影响现有功能
4. **GitHub Actions 缓存有 10GB 限制**，npm 缓存通常占用 < 1GB

## 相关文档

- [Docker BuildKit 缓存挂载](https://docs.docker.com/build/cache/optimize/#use-cache-mounts)
- [GitHub Actions 缓存限制](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows#usage-limits-and-eviction-policy)
