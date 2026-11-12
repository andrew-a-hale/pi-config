-- LazyVim ships no html/css extra, so the two servers are named here.
-- Naming them is what makes mason install and enable them.
return {
  "neovim/nvim-lspconfig",
  opts = { servers = { html = {}, cssls = {} } },
}
