import { useCallback, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";

export function useFilterKeyword() {
  const [filterKeyword, setFilterKeyword] = useState("");
  const FilterKeyword = useCallback(function FilterKeyword() {
    const onChange = (value: string) => {
      const keyword = value.trim().toLowerCase();
      setFilterKeyword(keyword);
    };
    return (
      <Input
        fullWidth
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        }
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }, []);
  return [filterKeyword, FilterKeyword] as const;
}
