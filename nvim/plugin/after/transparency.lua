-- Make highlight groups transparent while preserving their other attributes
local function make_transparent(name)
	local ok, hl = pcall(vim.api.nvim_get_hl, 0, { name = name, link = false })
	if ok then
		hl.bg = nil
		vim.api.nvim_set_hl(0, name, hl)
	end
end

-- The current line goes see-through too, leaving its number to mark it.
local groups = {
	"Normal",
	"NormalFloat",
	"FloatBorder",
	"Pmenu",
	"Terminal",
	"EndOfBuffer",
	"FoldColumn",
	"Folded",
	"SignColumn",
	"LineNr",
	"CursorLineNr",
	"StatusLine",
	"StatusLineNC",
	"NormalNC",
	"WhichKeyFloat",
	"CursorLine",
}

for _, name in ipairs(groups) do
	make_transparent(name)
end
