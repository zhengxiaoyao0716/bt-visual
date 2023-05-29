import { useCallback, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";

export function useFilterKeyword() {
  const [filterKeyword, setFilterKeyword] = useState("");
  const FilterKeyword = useCallback(function FilterKeyword() {
    const onChange = (value: string) => {
      const keyword = value.trim().toLowerCase();
      setFilterKeyword(keyword);
    };
    return (
      <InputLabel sx={{ width: "100%" }}>
        <Input
          fullWidth
          aria-label="Filter keyword"
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          }
          onChange={(event) => onChange(event.target.value)}
        />
      </InputLabel>
    );
  }, []);
  return [filterKeyword, FilterKeyword] as const;
}
