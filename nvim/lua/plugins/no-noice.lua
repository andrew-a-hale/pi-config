-- noice replaces the cmdline/messages UI; nui exists only as its dependency.
-- Both off: stock bottom cmdline, messages in :messages.
return {
  { "folke/noice.nvim", enabled = false },
  { "MunifTanjim/nui.nvim", enabled = false },
}
