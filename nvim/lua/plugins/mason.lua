-- The extra registry is where the `roslyn` C# server package lives.
-- codelldb is dropped from the extras' ensure_installed: nvim-dap isn't
-- installed, so that debugger could never be used.
return {
  "williamboman/mason.nvim",
  opts = function(_, opts)
    opts.registries = {
      "github:mason-org/mason-registry",
      "github:mason-org/mason-system-registry",
      "github:Crashdummyy/mason-registry",
    }
    opts.ensure_installed = vim.tbl_filter(function(p)
      return p ~= "codelldb"
    end, opts.ensure_installed or {})
  end,
}
