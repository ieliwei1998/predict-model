package com.house.controller;

import com.house.dto.HouseDTO;
import com.house.request.AnalysisRequest;
import com.house.request.WhatIfRequest;
import com.house.response.WhatIfResponse;
import com.house.service.ExcelDataService;
import com.house.service.MlClientService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.util.ObjectUtils;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MarketController {

    @Autowired
    private MlClientService mlClientService;

    @Autowired
    private ExcelDataService excelDataService;


    // ========== 筛选接口：@RequestBody + AnalysisRequest ==========
    @PostMapping("/analysis")
    public List<HouseDTO> getAnalysis(@RequestBody(required = false) AnalysisRequest req) {
        if (ObjectUtils.isEmpty(req)) {
            return List.of();
        }

        List<HouseDTO> all = excelDataService.readAllData();

        Integer minBedrooms = req.getMinBedrooms();
        Integer maxBedrooms = req.getMaxBedrooms();
        Double minSchoolRating = req.getMinSchoolRating();
        Double minPrice = req.getMinPrice();
        Double maxPrice = req.getMaxPrice();
        Double minSqft = req.getMinSqft();
        Double maxSqft = req.getMaxSqft();
        Double minDistance = req.getMinDistance();
        Double maxDistance = req.getMaxDistance();

        return all.stream()
                .filter(r -> minBedrooms == null || r.getBedrooms() != null
                        && r.getBedrooms() >= minBedrooms)
                .filter(r -> maxBedrooms == null || r.getBedrooms() != null
                        && r.getBedrooms() <= maxBedrooms)
                .filter(r -> minSchoolRating == null || r.getSchoolRating() != null
                        && r.getSchoolRating() >= minSchoolRating)
                .filter(r -> minPrice == null || r.getPrice() != null
                        && r.getPrice() >= minPrice)
                .filter(r -> maxPrice == null || r.getPrice() != null
                        && r.getPrice() <= maxPrice)
                .filter(r -> minSqft == null || r.getSquareFootage() != null
                        && r.getSquareFootage() >= minSqft)
                .filter(r -> maxSqft == null || r.getSquareFootage() != null
                        && r.getSquareFootage() <= maxSqft)
                .filter(r -> minDistance == null || r.getDistanceToCityCenter() != null
                        && r.getDistanceToCityCenter() >= minDistance)
                .filter(r -> maxDistance == null || r.getDistanceToCityCenter() != null
                        && r.getDistanceToCityCenter() <= maxDistance)
                .collect(Collectors.toList());
    }

    // ========== What-If 分析 ==========
    @PostMapping("/what-if")
    @Cacheable(
            value = "predictionCache",
            key = "#req",
            sync = true
    )
    public WhatIfResponse whatIf(@RequestBody WhatIfRequest req) {
        System.out.println("🔴 缓存未命中 → 正在计算并调用 ML API...");

        // ---- 基准值兜底 ----
        final double DEF_SQFT = 1500.0;
        final int DEF_BED = 3;
        final double DEF_BATH = 2.0;
        final int DEF_YEAR = 1995;
        final double DEF_DIST = 4.0;
        final double DEF_RATING = 7.5;

        double baseSqft = req.getBaseSquareFootage() != null ? req.getBaseSquareFootage() : DEF_SQFT;
        int baseBedrooms = req.getBaseBedrooms() != null ? req.getBaseBedrooms() : DEF_BED;
        double baseBathrooms = req.getBaseBathrooms() != null ? req.getBaseBathrooms() : DEF_BATH;
        int baseYearBuilt = req.getBaseYearBuilt() != null ? req.getBaseYearBuilt() : DEF_YEAR;
        double baseLotSize = req.getBaseLotSize() != null ? req.getBaseLotSize() : baseSqft * 4.0;
        double baseDistance = req.getBaseDistanceToCityCenter() != null ? req.getBaseDistanceToCityCenter() : DEF_DIST;
        double baseRating = req.getBaseSchoolRating() != null ? req.getBaseSchoolRating() : DEF_RATING;

        // ---- 新值：null 则沿用基准 ----
        double newSqft = req.getNewSquareFootage() != null ? req.getNewSquareFootage() : baseSqft;
        int newBedrooms = req.getNewBedrooms() != null ? req.getNewBedrooms() : baseBedrooms;
        double newBathrooms = req.getNewBathrooms() != null ? req.getNewBathrooms() : baseBathrooms;
        int newYearBuilt = req.getNewYearBuilt() != null ? req.getNewYearBuilt() : baseYearBuilt;
        double newLotSize = req.getNewLotSize() != null ? req.getNewLotSize() : baseLotSize;
        double newDistance = req.getNewDistanceToCityCenter() != null ? req.getNewDistanceToCityCenter() : baseDistance;
        double newRating = req.getNewSchoolRating() != null ? req.getNewSchoolRating() : baseRating;

        // ---- 构造基准房源 ----
        HouseDTO baseHouse = new HouseDTO(baseSqft, baseBedrooms, baseBathrooms, baseYearBuilt, baseLotSize, baseDistance, baseRating, null);

        // ---- 构造修改后房源 ----
        HouseDTO modifiedHouse = new HouseDTO(newSqft, newBedrooms, newBathrooms, newYearBuilt, newLotSize, newDistance, newRating, null);


        // ---- 调用 ML 模型 ----
        double basePrice = mlClientService.predict(baseHouse);
        double modifiedPrice = mlClientService.predict(modifiedHouse);

        baseHouse.setPrice(basePrice);
        modifiedHouse.setPrice(modifiedPrice);
        // ---- 各项独立影响明细 ----
        Map<String, Double> breakdown = new LinkedHashMap<>();
        if (equal(baseSqft, newSqft)) {
            HouseDTO t = copyBase(baseHouse);
            t.setSquareFootage(newSqft);
            breakdown.put("建筑面积", round(mlClientService.predict(t) - basePrice));
        }
        if (equal(baseBedrooms, newBedrooms)) {
            HouseDTO t = copyBase(baseHouse);
            t.setBedrooms(newBedrooms);
            breakdown.put("卧室数量", round(mlClientService.predict(t) - basePrice));
        }
        if (equal(baseBathrooms, newBathrooms)) {
            HouseDTO t = copyBase(baseHouse);
            t.setBathrooms(newBathrooms);
            breakdown.put("卫生间数量", round(mlClientService.predict(t) - basePrice));
        }
        if (equal(baseYearBuilt, newYearBuilt)) {
            HouseDTO t = copyBase(baseHouse);
            t.setYearBuilt(newYearBuilt);
            breakdown.put("建造年份", round(mlClientService.predict(t) - basePrice));
        }
        if (equal(baseLotSize, newLotSize)) {
            HouseDTO t = copyBase(baseHouse);
            t.setLotSize(newLotSize);
            breakdown.put("地块面积", round(mlClientService.predict(t) - basePrice));
        }
        if (equal(baseDistance, newDistance)) {
            HouseDTO t = copyBase(baseHouse);
            t.setDistanceToCityCenter(newDistance);
            breakdown.put("距市区距离", round(mlClientService.predict(t) - basePrice));
        }
        if (equal(baseRating, newRating)) {
            HouseDTO t = copyBase(baseHouse);
            t.setSchoolRating(newRating);
            breakdown.put("学区评分", round(mlClientService.predict(t) - basePrice));
        }

        // ---- 组装结果 ----
        WhatIfResponse resp = new WhatIfResponse();
        resp.setBasePrice(round(basePrice));
        resp.setModifiedPrice(round(modifiedPrice));
        resp.setDifference(round(modifiedPrice - basePrice));
        resp.setBreakdown(breakdown);
        return resp;
    }

    // ========== 工具方法， 保留两位小数 ==========
    private double round(double v) {
        return Math.round(v * 100) / 100.0;
    }

    private boolean equal(Number a, Number b) {
        return !(Math.abs(a.doubleValue() - b.doubleValue()) < 1e-9);
    }

    private HouseDTO copyBase(HouseDTO src) {
        HouseDTO t = new HouseDTO();
        t.setSquareFootage(src.getSquareFootage());
        t.setBedrooms(src.getBedrooms());
        t.setBathrooms(src.getBathrooms());
        t.setYearBuilt(src.getYearBuilt());
        t.setLotSize(src.getLotSize());
        t.setDistanceToCityCenter(src.getDistanceToCityCenter());
        t.setSchoolRating(src.getSchoolRating());
        return t;
    }

}