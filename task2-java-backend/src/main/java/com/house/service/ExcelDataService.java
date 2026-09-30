package com.house.service;

import com.house.dto.HouseDTO;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class ExcelDataService {

    private final List<HouseDTO>  houseDTOList = new ArrayList<>();

    public List<HouseDTO> readAllData() {
        if (houseDTOList.isEmpty()) {
            String filePath = "data/house_data.xlsx";
            try (InputStream fis = new ClassPathResource(filePath).getInputStream();
                 Workbook workbook = new XSSFWorkbook(fis)) {

                Sheet sheet = workbook.getSheetAt(0);
                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;

                    HouseDTO r = new HouseDTO();
                    r.setSquareFootage(getDoubleValue(row.getCell(1)));
                    r.setBedrooms(getIntValue(row.getCell(2)));
                    r.setBathrooms(getDoubleValue(row.getCell(3)));
                    r.setYearBuilt(getIntValue(row.getCell(4)));
                    r.setLotSize(getDoubleValue(row.getCell(5)));
                    r.setDistanceToCityCenter(getDoubleValue(row.getCell(6)));
                    r.setSchoolRating(getDoubleValue(row.getCell(7)));
                    r.setPrice(getDoubleValue(row.getCell(8)));

                    houseDTOList.add(r);
                }
            } catch (Exception e) {
                throw new RuntimeException("读取Excel文件失败：" + e.getMessage(), e);
            }
        }
        return houseDTOList;

    }

    private Double getDoubleValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                try {
                    yield Double.parseDouble(cell.getStringCellValue().trim());
                } catch (NumberFormatException e) {
                    yield null;
                }
            }
            default -> null;
        };
    }

    private Integer getIntValue(Cell cell) {
        if (cell == null) return null;
        Double val = getDoubleValue(cell);
        return val == null ? null : val.intValue();
    }
}