-- gopls configuration for LazyVim
-- Disables ST1000 analyzer (package comment required)

return {
  "neovim/nvim-lspconfig",
  opts = {
    servers = {
      gopls = {
        settings = {
          gopls = {
            analyses = {
              ST1000 = false, -- Disable "package comment required" analyzer
              ST1003 = false, -- Disable "poorly chosen identifier" analyzer (ALL_CAPS naming)
            },
            staticcheck = true, -- Keep other staticcheck analyzers enabled
          },
        },
      },
    },
  },
}
